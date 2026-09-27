import { createClient } from "npm:@supabase/supabase-js@2.117.2";
import webpush from "npm:web-push@3.6.7";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const secretKeys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}");
const SECRET_KEY = secretKeys.default || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const admin = createClient(SUPABASE_URL,SECRET_KEY,{auth:{persistSession:false,autoRefreshToken:false}});

Deno.serve(async (req: Request) => {
  if(req.method!=="POST") return new Response("Method not allowed",{status:405});
  try{
    const body=await req.json().catch(()=>({}));
    const token=typeof body?.token==="string"?body.token:"";
    const {data:authorized,error:authError}=await admin.rpc("verify_push_cron_token",{p_token:token});
    if(authError||authorized!==true) return new Response("Unauthorized",{status:401});

    const {data:vapid,error:vapidError}=await admin.rpc("push_vapid_config");
    if(vapidError||!vapid?.publicKey||!vapid?.privateKey||!vapid?.subject) throw vapidError||new Error("VAPID config missing");
    webpush.setVapidDetails(vapid.subject,vapid.publicKey,vapid.privateKey);

    const {data:jobs,error:claimError}=await admin.rpc("push_claim_outbox",{p_limit:20});
    if(claimError) throw claimError;

    let sent=0,failed=0,cancelled=0,devices=0;
    for(const job of jobs||[]){
      const {data:subs,error:subError}=await admin.rpc("push_get_subscriptions",{p_user_id:job.user_id});
      if(subError){
        await admin.rpc("push_finish_outbox",{p_id:job.id,p_state:"failed",p_error:subError.message,p_provider_message_id:null});
        failed+=1; continue;
      }
      if(!subs?.length){
        await admin.rpc("push_finish_outbox",{p_id:job.id,p_state:"cancelled",p_error:"no_active_subscription",p_provider_message_id:null});
        cancelled+=1; continue;
      }

      let successes=0;
      const errors=[];
      for(const sub of subs){
        try{
          const response=await webpush.sendNotification({
            endpoint:sub.endpoint,
            keys:{p256dh:sub.p256dh,auth:sub.auth}
          },JSON.stringify(job.payload||{}),{
            TTL:3600,
            urgency:"normal"
          });
          devices+=1;
          successes+=1;
          const messageId=response?.headers?.location||response?.headers?.["x-request-id"]||null;
          if(messageId) errors.push("message:"+String(messageId).slice(0,180));
        }catch(error){
          const status=Number(error?.statusCode ?? 0);
          if(status===404||status===410){
            await admin.rpc("push_delete_subscription_by_id",{p_id:sub.id});
          }
          errors.push((error instanceof Error?error.message:String(error)).slice(0,300));
        }
      }
      if(successes>0){
        await admin.rpc("push_finish_outbox",{p_id:job.id,p_state:"sent",p_error:null,p_provider_message_id:null});
        sent+=1;
      }else{
        await admin.rpc("push_finish_outbox",{p_id:job.id,p_state:"failed",p_error:errors.join(" | ").slice(0,1000),p_provider_message_id:null});
        failed+=1;
      }
    }

    return Response.json({ok:true,claimed:(jobs||[]).length,sent,failed,cancelled,devices,processedAt:new Date().toISOString()});
  }catch(error){
    console.error(error);
    return Response.json({ok:false,error:error instanceof Error?error.message:"Unknown error"},{status:500});
  }
});
