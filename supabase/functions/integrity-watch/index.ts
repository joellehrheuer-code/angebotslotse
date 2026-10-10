import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import postgres from "npm:postgres@3.4.7";

const dbUrl=Deno.env.get("SUPABASE_DB_URL");
if(!dbUrl) throw new Error("SUPABASE_DB_URL missing");
const sql=postgres(dbUrl,{prepare:false,max:1,idle_timeout:10,connect_timeout:10});
const TREE_URL="https://api.github.com/repos/joellehrheuer-code/angebotslotse/git/trees/main?recursive=1";

function json(body:unknown,status=200){
  return new Response(JSON.stringify(body),{
    status,
    headers:{
      "content-type":"application/json; charset=utf-8",
      "cache-control":"no-store",
      "x-content-type-options":"nosniff",
      "x-frame-options":"DENY",
      "referrer-policy":"no-referrer",
      "permissions-policy":"camera=(), microphone=(), geolocation=(), payment=(), usb=()"
    }
  });
}

Deno.serve(async req=>{
  if(req.method!=="POST") return json({error:"method_not_allowed"},405);
  try{
    const runtime=await sql`
      select last_scan_at
      from private.code_integrity_runtime
      where singleton=true
      limit 1
    `;
    if(runtime[0]?.last_scan_at && Date.now()-new Date(runtime[0].last_scan_at as string).getTime()<5*60*1000){
      return json({ok:true,status:"throttled"});
    }

    const baseline=await sql`
      select path,git_blob_sha,content_size,approved_commit_sha
      from private.code_integrity_baseline
      order by path
    `;

    const gh=await fetch(TREE_URL,{
      headers:{
        "accept":"application/vnd.github+json",
        "user-agent":"Angebotslotse-Integrity-Watch/1.0"
      },
      redirect:"follow"
    });
    if(!gh.ok) throw new Error("github_tree_"+gh.status);
    const tree=await gh.json();
    const byPath=new Map((tree.tree||[]).filter((x:any)=>x.type==="blob").map((x:any)=>[String(x.path),String(x.sha)]));

    const mismatches:any[]=[];
    for(const row of baseline){
      const path=String(row.path);
      const expected=String(row.git_blob_sha);
      const actual=byPath.get(path)||null;
      if(actual!==expected){
        mismatches.push({path,expected,actual});
        // One unresolved security event per watched file. A further GitHub commit
        // changes the actual blob, but must NOT generate a fresh urgent ticket
        // until an authorized reviewer updates the protected baseline.
        const existing=await sql`
          select id, actual_sha
          from private.code_integrity_events
          where path=${path} and resolved_at is null
          order by detected_at asc
          limit 1
        `;
        if(existing.length===0){
          const eventKey=path+":"+(actual||"missing");
          const created=await sql`
            insert into private.code_integrity_events
              (event_key,path,expected_sha,actual_sha,details)
            values(
              ${eventKey},
              ${path},
              ${expected},
              ${actual},
              ${JSON.stringify({approved_commit_sha:row.approved_commit_sha,current_tree_sha:tree.sha||null})}::jsonb
            )
            on conflict(event_key) do nothing
            returning id
          `;
          if(created.length){
            await sql`
              insert into public.site_reports
                (report_type,priority,status,page_url,offer_slug,message,occurrence_count,automation_notes)
              values(
                'other','urgent','new',
                'https://github.com/joellehrheuer-code/angebotslotse',
                null,
                ${"SECURITY: Unerwartete Code-Änderung an "+path+" (erwartet "+expected+", aktuell "+(actual||"missing")+")."},
                1,
                'Code-Integritätswächter: Eine offene Warnung pro Pfad. Baseline nur nach bewusster Überprüfung aktualisieren.'
              )
            `;
          }
        }else if(String(existing[0].actual_sha||"")!==String(actual||"")){
          await sql`
            update private.code_integrity_events
            set actual_sha=${actual},
                details=${JSON.stringify({approved_commit_sha:row.approved_commit_sha,current_tree_sha:tree.sha||null,latest_actual_sha:actual})}::jsonb
            where id=${existing[0].id}
          `;
        }
      }else{
        await sql`
          update private.code_integrity_events
          set resolved_at=now()
          where path=${path}
            and resolved_at is null
        `;
      }
    }

    await sql`
      insert into private.code_integrity_runtime
        (singleton,last_scan_at,last_commit_sha,last_status,last_error,updated_at)
      values(
        true,now(),${tree.sha||null},${mismatches.length?"mismatch":"ok"},null,now()
      )
      on conflict(singleton) do update set
        last_scan_at=excluded.last_scan_at,
        last_commit_sha=excluded.last_commit_sha,
        last_status=excluded.last_status,
        last_error=null,
        updated_at=excluded.updated_at
    `;

    return json({ok:true,status:mismatches.length?"mismatch":"ok",checked:baseline.length,mismatches});
  }catch(error){
    const message=error instanceof Error?error.message:String(error);
    try{
      await sql`
        insert into private.code_integrity_runtime
          (singleton,last_scan_at,last_status,last_error,updated_at)
        values(true,now(),'error',${message.slice(0,1000)},now())
        on conflict(singleton) do update set
          last_scan_at=excluded.last_scan_at,
          last_status='error',
          last_error=excluded.last_error,
          updated_at=excluded.updated_at
      `;
    }catch{}
    console.error("integrity-watch failure",error);
    return json({error:"integrity_scan_failed"},500);
  }
});