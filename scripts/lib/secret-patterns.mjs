// Scan deployable public files for unmistakable credentials, even when the
// corresponding GitHub Actions secret is NOT available in a particular job.
const patterns=[
  ["private-key",/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ["github-token",/\bgh[pousr]_[A-Za-z0-9]{30,}\b/],
  ["github-fine-grained-token",/\bgithub_pat_[A-Za-z0-9_]{40,}\b/],
  ["openai-secret",/\bsk-proj-[A-Za-z0-9_-]{24,}\b/],
  ["stripe-secret",/\bsk_(?:live|test)_[A-Za-z0-9]{20,}\b/],
  ["stripe-webhook-secret",/\bwhsec_[A-Za-z0-9]{20,}\b/],
  ["slack-secret",/\bxox[baprs]-[A-Za-z0-9-]{30,}\b/],
  ["aws-access-key",/\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/]
];

export function detectHighRiskCredential(value){
  const text=String(value??"");
  return patterns.filter(([,re])=>re.test(text)).map(([name])=>name);
}
export function isPotentiallySensitivePublicFilename(name){
  const path=String(name??"").replaceAll("\\","/");
  return /(?:^|\/)\.env(?:\.[^/]*)?$|\.(?:pem|p12|pfx|key)$/i.test(path);
}
