import { build } from "esbuild";
import { mkdir, writeFile, access } from "node:fs/promises";
import { createRequire } from "node:module";
await mkdir("public/content", { recursive: true });
await mkdir("artifacts", { recursive: true });
try {
  await access("public/content/site.json");
} catch {
  await build({
    entryPoints: ["src/data.ts"],
    bundle: true,
    platform: "node",
    format: "cjs",
    outfile: "artifacts/demo-data.cjs",
    define: { "import.meta.env.BASE_URL": '"/"' },
  });
  const require = createRequire(import.meta.url);
  await writeFile(
    "public/content/site.json",
    JSON.stringify(require("../artifacts/demo-data.cjs").demo, null, 2),
  );
}
await build({
  entryPoints: ["src/main.tsx"],
  bundle: true,
  format: "iife",
  target: "es2022",
  minify: true,
  outfile: "public/offline-runtime.js",
  jsx: "automatic",
  loader: { ".woff2": "dataurl", ".woff": "dataurl" },
  define: {
    "import.meta.env.BASE_URL": '"./"',
    "import.meta.env.DEV": "false",
    "process.env.NODE_ENV": '"production"',
  },
});
console.log("Offline runtime built with embedded fonts.");
