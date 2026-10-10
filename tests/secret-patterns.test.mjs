import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {detectHighRiskCredential,isPotentiallySensitivePublicFilename} from "../scripts/lib/secret-patterns.mjs";

test("secret scanner finds private key and cloud credentials in public text",()=>{
  assert.deepEqual(detectHighRiskCredential("-----BEGIN PRIVATE KEY-----"),["private-key"]);
  assert.ok(detectHighRiskCredential("ghp_"+"A".repeat(35)).includes("github-token"));
  assert.ok(detectHighRiskCredential("sk-proj-"+"A".repeat(28)).includes("openai-secret"));
  assert.ok(detectHighRiskCredential("AKIA"+"A".repeat(16)).includes("aws-access-key"));
});
test("no false positives for public Supabase config and affiliate tracking codes",()=>{
  assert.deepEqual(detectHighRiskCredential('SUPABASE_PUBLISHABLE_KEY=sb_publishable_abc123'),[]);
  assert.deepEqual(detectHighRiskCredential("Rabattcode ABC15"),[]);
  assert.deepEqual(detectHighRiskCredential("affiliate uid=127"),[]);
});
test("private key / env extensions must not be publicly deployed",()=>{
  for(const name of ["dist/.env","public/.env.production","public/secrets.pem","dist/key.p12"])
    assert.equal(isPotentiallySensitivePublicFilename(name),true);
  assert.equal(isPotentiallySensitivePublicFilename("public/manifest.webmanifest"),false);
  assert.equal(isPotentiallySensitivePublicFilename("public/joel-logo.svg"),false);
});
test("secret audit checks patterns even if GitHub Actions has no secret environment value",()=>{
  const script=fs.readFileSync("scripts/security-check.mjs","utf8");
  assert.match(script,/detectHighRiskCredential\(visible\)/);
  assert.match(script,/isPotentiallySensitivePublicFilename\(p\)/);
});
