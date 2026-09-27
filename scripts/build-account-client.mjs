import { build } from "esbuild";

await build({
  entryPoints: ["src/account-client.js"],
  outfile: "public/account-client.js",
  bundle: true,
  minify: true,
  format: "iife",
  platform: "browser",
  target: ["es2020"],
  legalComments: "none",
  sourcemap: false,
  charset: "utf8"
});

console.log("Account-Client gebaut.");
