import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("Newsletter Double-Opt-in versendet Bestätigung serverseitig", () => {
  const intake = fs.readFileSync("supabase/functions/public-intake/index.ts", "utf8");
  const app = fs.readFileSync("public/app.js", "utf8");

  assert.match(intake, /RESEND_API_KEY/);
  assert.match(intake, /NEWSLETTER_FROM_EMAIL/);
  assert.match(intake, /https:\/\/api\.resend\.com\/emails/);
  assert.match(intake, /pending_confirmation/);
  assert.match(intake, /confirmation_sent_at/);
  assert.match(intake, /email_not_configured/);
  assert.match(intake, /confirmation_email_failed/);
  assert.doesNotMatch(intake, /res_[A-Za-z0-9_-]{20,}/);
  assert.match(app, /Newsletter-Mailversand wird gerade eingerichtet/);
  assert.match(app, /Bestätigungsmail konnte gerade nicht versendet werden/);
});
