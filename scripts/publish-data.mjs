import { readFile, writeFile, mkdir } from "node:fs/promises";
import { build } from "esbuild";
import { createRequire } from "node:module";
import { createHash } from "node:crypto";
import { join } from "node:path";
// pnpm can forward the script separator while npm consumes it.
const args = process.argv.slice(2);
while (args[0] === "--") args.shift();
const input = args[0];
const outputRoot = args[1] || "public";
if (!input) throw new Error("Dùng: npm run publish:data -- đường-dẫn-gói.json");
await mkdir("artifacts", { recursive: true });
await build({
  entryPoints: ["src/model.ts"],
  bundle: true,
  platform: "node",
  format: "cjs",
  outfile: "artifacts/model.cjs",
});
const require = createRequire(import.meta.url);
const data = JSON.parse(await readFile(input, "utf8"));
const errors = require("../artifacts/model.cjs").validateStore(data);
if (errors.length) throw new Error(errors.join("\n"));
await mkdir(join(outputRoot, "media"), { recursive: true });
async function extract(url) {
  if (!url.startsWith("data:")) return url;
  const match = /^data:([^;,]+);base64,([\s\S]+)$/.exec(url);
  if (!match) throw new Error("Tài nguyên nhúng phải là data URL base64.");
  const extensions = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "image/svg+xml": "svg",
    "audio/mpeg": "mp3",
    "audio/mp3": "mp3",
    "audio/wav": "wav",
    "audio/x-wav": "wav",
    "audio/ogg": "ogg",
    "audio/mp4": "m4a",
    "audio/x-m4a": "m4a",
    "audio/webm": "webm",
  };
  const ext = extensions[match[1]];
  if (!ext) throw new Error("Định dạng ảnh/nhạc chưa được hỗ trợ: " + match[1]);
  const bytes = Buffer.from(match[2], "base64");
  if (bytes.length > 90 * 1024 * 1024)
    throw new Error(
      "Một tài nguyên vượt 90 MB. Hãy chọn tệp nhỏ hơn để lưu trên GitHub.",
    );
  const name =
    createHash("sha256").update(bytes).digest("hex").slice(0, 24) + "." + ext;
  await writeFile(join(outputRoot, "media", name), bytes);
  return "/media/" + name;
}
for (const event of data.events) {
  for (const person of event.recipients)
    person.photos = await Promise.all(person.photos.map(extract));
  if (event.musicUrl) event.musicUrl = await extract(event.musicUrl);
}
await mkdir(join(outputRoot, "content"), { recursive: true });
await writeFile(
  join(outputRoot, "content/site.json"),
  JSON.stringify(data, null, 2),
);
console.log("Đã cập nhật dữ liệu. Commit và push để xuất bản.");
