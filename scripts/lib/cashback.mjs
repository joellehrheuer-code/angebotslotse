const num=value=>{
  const n=Number(value);
  return Number.isFinite(n)?n:null;
};
const iso=value=>{
  if(!value)return null;
  const d=new Date(value);
  return Number.isNaN(d.getTime())?null:d.toISOString();
};

export function normalizeAwinTransaction(row={}){
  const id=String(row.id??row.transactionId??"").trim();
  const advertiserId=String(row.advertiserId??"").trim();
  if(!id||!advertiserId)return null;
  const status=String(row.commissionStatus??row.status??"").toLowerCase();
  const sale=num(row.saleAmount?.amount??row.saleAmount);
  const commission=num(row.commissionAmount?.amount??row.commissionAmount);
  const currency=String(row.commissionAmount?.currency??row.saleAmount?.currency??"EUR").toUpperCase();
  const clickRef=String(row.clickRefs?.clickRef??row.clickRef??"").trim()||null;
  return {
    network:"Awin",
    external_transaction_id:id,
    merchant_key:"awin:"+advertiserId,
    click_ref:clickRef,
    order_amount:sale!=null&&sale>=0?sale:null,
    commission_amount:commission!=null&&commission>=0?commission:null,
    currency:/^[A-Z]{3}$/.test(currency)?currency:"EUR",
    transaction_status:status||null,
    occurred_at:iso(row.transactionDate??row.transactionTime??row.clickThroughTime),
    raw_payload:{
      advertiserId:Number.isFinite(Number(advertiserId))?Number(advertiserId):advertiserId,
      advertiserName:String(row.advertiserName??"").slice(0,180)||null,
      type:String(row.type??"").slice(0,80)||null
    }
  };
}

export function claimStatusForNetworkStatus(status){
  const value=String(status??"").toLowerCase();
  if(value==="approved")return "confirmed";
  if(value==="declined"||value==="deleted")return "rejected";
  return "pending";
}

export function buildCashbackClaim({transaction,clickToken,program}={}){
  if(!transaction||!clickToken||!program)return null;
  if(program.eligibility!=="allowed")return null;
  const share=Number(program.commission_share_bps);
  const commission=Number(transaction.commission_amount);
  if(!Number.isFinite(share)||share<=0||share>10000)return null;
  if(!Number.isFinite(commission)||commission<0)return null;
  if(String(transaction.click_ref||"")!==String(clickToken.token||""))return null;
  const amount=Math.floor(commission*share+0.000001)/10000;
  return {
    user_id:clickToken.user_id,
    merchant_key:transaction.merchant_key,
    transaction_ref:"awin:"+transaction.external_transaction_id,
    claim_status:claimStatusForNetworkStatus(transaction.transaction_status),
    order_amount:transaction.order_amount,
    commission_amount:transaction.commission_amount,
    cashback_amount:Number(amount.toFixed(2)),
    currency:transaction.currency||"EUR",
    transaction_at:transaction.occurred_at,
    confirmed_at:claimStatusForNetworkStatus(transaction.transaction_status)==="confirmed"?new Date().toISOString():null
  };
}
