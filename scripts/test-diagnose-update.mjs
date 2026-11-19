import assert from "node:assert/strict";
import { diagnostic } from "./diagnose-update.mjs";

const secret = "SECRET_TOKEN_MUST_NOT_LEAK";
const status = {
  state: "degraded",
  publishableOffers: 0,
  sources: {
    awin: {state:"error",count:0,error:`Awin Offers API: HTTP 401 ${secret}`},
    "awin-enhanced-feeds": {state:"error",count:0,error:"Awin programme discovery failed HTTP 403"},
    direct: {state:"ok",count:15,error:null},
    impact: {state:"ok",count:8,error:null}
  }
};
const markdown = diagnostic(status,[{title:"private offer",url:"https://private.example/test"}]);
assert.match(markdown,/AUTHORIZATION/);
assert.match(markdown,/Awin-Autorisierung/);
assert.match(markdown,/\| direct \| ok \| 15 \|/);
assert.match(markdown,/\| impact \| ok \| 8 \|/);
assert.doesNotMatch(markdown,/SECRET_TOKEN|private\.example|private offer/);
assert.match(diagnostic({},[]),/Keine gültigen Deals/);
const impactStatus = {
  publishableOffers: 0,
  sources: {
    impact: {
      state: "ok", count: 8,
      audit: { productDiagnostics: { linkFailureReasons: {
        "deeplinking-not-approved": 180,
        "unverified-merchant-domain": 20,
        "untrusted-token-value": secret,
        "program-link-not-allowed": "https://private.example/secret"
      } } }
    }
  }
};
const impactReport = diagnostic(impactStatus, []);
assert.match(impactReport, /Deeplinking nicht freigegeben: \\*\\*180\\*\\*/);
assert.match(impactReport, /Händlerdomain nicht bestätigt: \\*\\*20\\*\\*/);
assert.doesNotMatch(impactReport, /SECRET_TOKEN|private\\.example|untrusted-token-value/);
assert.doesNotMatch(impactReport, /Programm-Trackinglink nicht erlaubt/);
console.log("Source diagnostic tests passed");
