import { pathToFileURL } from "node:url";

const API = "https://api.awin.com";

export function tokenFormatFlags(raw) {
  const token = String(raw ?? "");
  const trimmed = token.trim();
  return {
    present: Boolean(token),
    outerWhitespace: token !== trimmed,
    multiline: /[\r\n]/.test(token),
    surroundingQuotes: /^(['"]).*\1$/s.test(trimmed),
    bearerPrefixInsideSecret: /^Bearer\s+/i.test(trimmed)
  };
}

export async function probeAwinAuth({ token, publisherId, fetchImpl = fetch }) {
  const flags = tokenFormatFlags(token);
  const id = String(publisherId ?? "");
  if (!/^\d+$/.test(id) || !flags.present) {
    return { flags, checks: [], status: "configuration-missing" };
  }
  if (flags.outerWhitespace || flags.multiline || flags.surroundingQuotes || flags.bearerPrefixInsideSecret) {
    return { flags, checks: [], status: "secret-format-invalid" };
  }
  const targets = [
    ["modern-partnerships", `${API}/public/v1/publishers/${id}/advertisers?limit=1`],
    ["legacy-programmes", `${API}/publishers/${id}/programmes?relationship=joined&countryCode=DE`]
  ];
  const checks = [];
  for (const [endpoint, url] of targets) {
    try {
      const response = await fetchImpl(url, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
        redirect: "error",
        signal: AbortSignal.timeout(12_000)
      });
      checks.push({ endpoint, httpStatus: response.status });
      // Never read response bodies or emit credential-bearing URLs/headers.
    } catch (error) {
      const code = error?.name === "TimeoutError" ? "timeout" : "network-error";
      checks.push({ endpoint, failure: code });
    }
  }
  const successes = checks.filter(check => check.httpStatus >= 200 && check.httpStatus < 300);
  return { flags, checks, status: successes.length === 2 ? "authenticated" : successes.length === 1 ? "partially-authenticated" : "not-authenticated" };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = await probeAwinAuth({ token: process.env.AWIN_API_TOKEN, publisherId: process.env.AWIN_PUBLISHER_ID });
  console.log("AWIN_AUTH_DIAGNOSTIC", JSON.stringify(result));
  if (result.status !== "authenticated") process.exitCode = 1;
}
