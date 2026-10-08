import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { transform } from "esbuild";

test("Browser-Client bleibt syntaktisch baubar", async () => {
  const source = fs.readFileSync("public/app.js", "utf8");
  const result = await transform(source, {
    loader: "js",
    target: "es2020",
    minify: true,
  });

  assert.ok(result.code.length > 0);
});
