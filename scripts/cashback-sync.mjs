import { createClient } from "@supabase/supabase-js";
import { fetchAwinTransactions, formatAwinDateTime } from "./lib/awin.mjs";
import { normalizeAwinTransaction, buildCashbackClaim } from "./lib/cashback.mjs";

const env=process.env;
const required=["AWIN_PUBLISHER_ID","AWIN_API_TOKEN","SUPABASE_URL","SUPABASE_SECRET_KEY"];
const missing=required.filter(name=>!env[name]);
if(missing.length){
  console.log("Cashback-Sync deaktiviert: "+missing.join(", ")+" fehlt.");
  process.exit(0);
}

const supabase=createClient(env.SUPABASE_URL,env.SUPABASE_SECRET_KEY,{
  auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}
});

const end=new Date();
const start=new Date(end);
start.setDate(start.getDate()-30);

const payload=await fetchAwinTransactions({
  publisherId:env.AWIN_PUBLISHER_ID,
  token:env.AWIN_API_TOKEN,
  startDate:formatAwinDateTime(start),
  endDate:formatAwinDateTime(end)
});
const rawRows=Array.isArray(payload)?payload:(payload?.transactions??[]);
const transactions=rawRows.map(normalizeAwinTransaction).filter(Boolean);

let imported=0,claims=0;
for(const tx of transactions){
  const { error:txError }=await supabase.schema("private").from("affiliate_transactions").upsert(tx,{onConflict:"network,external_transaction_id"});
  if(txError)throw txError;
  imported+=1;

  if(!tx.click_ref)continue;
  const [{data:token,error:tokenError},{data:program,error:programError}]=await Promise.all([
    supabase.schema("private").from("cashback_click_tokens").select("token,user_id,merchant_key,expires_at,used_at").eq("token",tx.click_ref).maybeSingle(),
    supabase.from("cashback_programs").select("merchant_key,eligibility,commission_share_bps").eq("merchant_key",tx.merchant_key).maybeSingle()
  ]);
  if(tokenError)throw tokenError;
  if(programError)throw programError;
  if(!token||!program)continue;
  if(new Date(token.expires_at).getTime()<Date.now())continue;
  const claim=buildCashbackClaim({transaction:tx,clickToken:token,program});
  if(!claim)continue;
  const { error:claimError }=await supabase.from("cashback_claims").upsert(claim,{onConflict:"transaction_ref"});
  if(claimError)throw claimError;
  claims+=1;
}

console.log("Cashback-Sync abgeschlossen: "+imported+" Awin-Transaktionen importiert, "+claims+" Ansprüche aktualisiert.");
