import { createClient } from "npm:@supabase/supabase-js@2.117.2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const publishableKeys = JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") || "{}");
const secretKeys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}");
const PUBLISHABLE_KEY = publishableKeys.default || Deno.env.get("SUPABASE_ANON_KEY") || "";
const SECRET_KEY = secretKeys.default || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const ALLOWED_ORIGIN = "https://joellehrheuer-code.github.io";

const cors = (origin: string | null) => ({
  "Access-Control-Allow-Origin": origin === ALLOWED_ORIGIN ? origin : ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin"
});

const text = (value: unknown, max: number) => typeof value === "string" ? value.trim().slice(0,max) : "";

Deno.serve(async (req: Request) => {
  const origin=req.headers.get("Origin");
  if(req.method==="OPTIONS") return new Response("ok",{headers:cors(origin)});
  if(req.method!=="POST") return new Response("Method not allowed",{status:405,headers:cors(origin)});
  try{
    const authHeader=req.headers.get("Authorization")||"";
    if(!authHeader.startsWith("Bearer ")) return new Response("Unauthorized",{status:401,headers:cors(origin)});

    const userClient=createClient(SUPABASE_URL,PUBLISHABLE_KEY,{
      global:{headers:{Authorization:authHeader}},
      auth:{persistSession:false,autoRefreshToken:false}
    });
    const {data:{user},error:userError}=await userClient.auth.getUser();
    if(userError||!user) return new Response("Unauthorized",{status:401,headers:cors(origin)});

    const body=await req.json().catch(()=>({}));
    const action=String(body?.action||"subscribe");
    const subscription=body?.subscription||{};
    const endpoint=text(subscription?.endpoint,2500);
    if(!endpoint) return Response.json({ok:false,error:"endpoint_required"},{status:400,headers:cors(origin)});
    const parsed=new URL(endpoint);
    if(parsed.protocol!=="https:") return Response.json({ok:false,error:"https_endpoint_required"},{status:400,headers:cors(origin)});

    const admin=createClient(SUPABASE_URL,SECRET_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
    if(action==="unsubscribe"){
      const {data,error}=await admin.rpc("push_delete_subscription",{p_user_id:user.id,p_endpoint:endpoint});
      if(error) throw error;
      return Response.json({ok:true,removed:Number(data)||0},{headers:cors(origin)});
    }
    if(action!=="subscribe") return Response.json({ok:false,error:"invalid_action"},{status:400,headers:cors(origin)});

    const p256dh=text(subscription?.keys?.p256dh,500);
    const auth=text(subscription?.keys?.auth,500);
    if(!p256dh||!auth) return Response.json({ok:false,error:"subscription_keys_required"},{status:400,headers:cors(origin)});

    const {data:id,error:storeError}=await admin.rpc("push_store_subscription",{
      p_user_id:user.id,p_endpoint:endpoint,p_p256dh:p256dh,p_auth:auth
    });
    if(storeError) throw storeError;

    const {error:prefError}=await admin.from("notification_preferences").upsert({
      user_id:user.id,push_price_alerts:true,push_new_matches:true
    },{onConflict:"user_id"});
    if(prefError) throw prefError;

    return Response.json({ok:true,id},{headers:cors(origin)});
  }catch(error){
    console.error(error);
    return Response.json({ok:false,error:error instanceof Error?error.message:"Unknown error"},{status:500,headers:cors(origin)});
  }
});
