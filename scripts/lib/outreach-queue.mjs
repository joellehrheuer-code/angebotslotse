const clean=value=>String(value??"").trim();
const key=value=>clean(value).toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g," ").trim();
const groupKey=value=>{
  const normalized=key(value);
  if(["anker de","anker solix","anker solix de"].includes(normalized))return "anker-group";
  return normalized;
};
const blockedAdult=/\b(?:adult|erotic|erotik|sexshop|sexspielzeug|sex\s?toy|vibrator|dildo|porn(?:o|ografie|ography)?|bdsm|lovense|satisfyer)\b/i;
const activeOrClosedStatuses=new Set(["pending","needs-info","approved","rejected","bounced","do-not-contact","pending-termination","reactivation-requested","review-requested","interested","joined","active","contacted","application-sent"]);

export function buildPartnerOutreachQueue({opportunities=[],statusRows=[],contactDirectory=[],generatedAt=new Date().toISOString(),dailyLimit=8}={}){
  const limit=Math.min(8,Math.max(1,Number(dailyLimit)||8));
  const statusByGroup=new Map(statusRows.map(row=>[groupKey(row.brand),row]).filter(([brand])=>brand));
  const contactByBrand=new Map(contactDirectory.map(row=>[key(row.brand),row]).filter(([brand])=>brand));
  const seen=new Set();
  const eligible=[];
  const excluded=[];
  for(const row of opportunities){
    const brand=clean(row.brand??row.name);
    const brandKey=key(brand);
    const familyKey=groupKey(brand);
    if(!brandKey||seen.has(familyKey))continue;
    seen.add(familyKey);
    const known=statusByGroup.get(familyKey);
    if(blockedAdult.test(`${brand} ${row.category??""}`)){ excluded.push({brand,reason:"adult-blocked"}); continue; }
    const knownStatus=key(known?.status).replace(/ /g,"-");
    if(known&&activeOrClosedStatuses.has(knownStatus)){
      const relation=key(known.brand)===brandKey?"existing-status":"related-brand-status";
      excluded.push({brand,reason:`${relation}:${known.status}`,relatedBrand:relation==="related-brand-status"?known.brand:null,status:known.status,lastContactAt:known.lastContactAt??null});
      continue;
    }
    if(String(row.status??"").toLowerCase()==="pending"||row.applicationSent){ excluded.push({brand,reason:"network-application-pending"}); continue; }
    if(row.applicationRequired===false&&row.applicationPossible===false&&row.kind!=="contact"){ excluded.push({brand,reason:"no-current-outreach-action"}); continue; }
    const contact=contactByBrand.get(brandKey)??null;
    const sendAllowed=Boolean(contact?.sendAllowed);
    eligible.push({
      id:`${String(row.network??"partner").toLowerCase().replace(/[^a-z0-9]+/g,"-")}-${row.advertiserId??row.programId??row.campaignId??brandKey.replace(/ /g,"-")}`,
      network:row.network??"Partner",brand,advertiserId:row.advertiserId??null,programId:row.programId??null,campaignId:row.campaignId??null,
      category:row.category??"Weitere",priority:row.priority??"niedrig",score:Number(row.score)||0,networkStatus:row.status??null,
      actionType:row.actionType??row.kind??"contact-research",
      contact:contact?.contact??null,
      contactType:contact?.contactType??null,
      contactSource:contact?.sourceUrl??null,
      contactState:contact?(sendAllowed?"verified-official-contact":"verified-contact-manual-review"):"official-contact-research-required",
      routineOutreachAllowed:sendAllowed,
      applicationDraft:row.applicationDraft??null,
      nextAction:sendAllowed
        ? "Verifizierten offiziellen Kontakt dedupliziert per Angebotslotse-Mail anschreiben; Netzwerk-AGB oder Vertragsbedingungen nicht automatisch bestätigen."
        : (contact?.notes??row.nextAction??"Offiziellen Affiliate-/Partnerkontakt verifizieren und erst danach dedupliziert anschreiben."),
      networkApplicationNextAction:row.nextAction??null,
      contractualSubmissionAllowed:false,
      reason:"Routine-Outreach darf nur an verifizierte offizielle Kontakte vorbereitet/versendet werden; Vertragsbedingungen, AGB, Exklusivität oder kostenpflichtige Verpflichtungen werden nicht automatisch akzeptiert."
    });
  }
  eligible.sort((a,b)=>b.score-a.score||String(a.brand).localeCompare(String(b.brand),"de"));
  return {generatedAt,dailyNewContactLimit:limit,safeguards:{dedupeAgainst:"report/partner-outreach-status.json",adultExcluded:true,automaticPaidCommitments:false,automaticContractAcceptance:false,routineOutreachRequiresVerifiedContact:true},nextBatch:eligible.slice(0,limit),backlog:eligible.slice(limit,50),excluded:excluded.slice(0,100)};
}
