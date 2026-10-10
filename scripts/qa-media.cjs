const { chromium } = require("../tools/mcp/node_modules/playwright");
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const out = path.resolve("artifacts/qa");
function wav() {
  const rate = 16000,
    samples = rate * 2,
    b = Buffer.alloc(44 + samples * 2);
  b.write("RIFF");
  b.writeUInt32LE(b.length - 8, 4);
  b.write("WAVEfmt ", 8);
  b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20);
  b.writeUInt16LE(1, 22);
  b.writeUInt32LE(rate, 24);
  b.writeUInt32LE(rate * 2, 28);
  b.writeUInt16LE(2, 32);
  b.writeUInt16LE(16, 34);
  b.write("data", 36);
  b.writeUInt32LE(samples * 2, 40);
  for (let i = 0; i < samples; i++)
    b.writeInt16LE(
      Math.round(Math.sin((i / rate) * 440 * Math.PI * 2) * 1500),
      44 + i * 2,
    );
  return b;
}
(async () => {
  const browser = await chromium.launch({ headless: true, channel: "msedge" });
  const report = [];
  try {
    const store = JSON.parse(
      fs.readFileSync("public/content/site.json", "utf8"),
    );
    store.events[0].musicUrl =
      "data:audio/wav;base64," + wav().toString("base64");
    const context = await browser.newContext();
    await context.route("**/content/site.json", (r) =>
      r.fulfill({ json: store }),
    );
    await context.addInitScript(() => {
      window.__audioInstances = [];
      const Original = window.Audio;
      window.Audio = class extends Original {
        constructor(...args) {
          super(...args);
          window.__audioInstances.push(this);
        }
      };
    });
    const p = await context.newPage();
    await p.goto("http://127.0.0.1:5173/");
    assert.equal(await p.evaluate(() => window.__audioInstances.length), 0);
    await p.locator("#account").fill("linh");
    await p.getByRole("button", { name: "Tìm thiệp của tôi" }).click();
    await p
      .getByRole("button", { name: "Mở phong thư", exact: true })
      .click({ force: true });
    await p.getByRole("button", { name: "Tắt nhạc", exact: true }).waitFor();
    assert.equal(
      await p.evaluate(() => window.__audioInstances[0].paused),
      false,
    );
    await p.getByRole("button", { name: "Tắt nhạc", exact: true }).click();
    assert.equal(
      await p.evaluate(() => window.__audioInstances[0].paused),
      true,
    );
    await p.getByRole("button", { name: "Bật nhạc", exact: true }).click();
    await p.getByRole("button", { name: "Tắt nhạc", exact: true }).waitFor();
    assert.equal(await p.evaluate(() => window.__audioInstances.length), 1);
    report.push(
      "Actual WAV playback starts after envelope gesture, mute/resume reuse one audio element under React StrictMode",
    );
    await context.close();
    const portable = JSON.parse(
      fs.readFileSync(path.join(out, "admin-export.json"), "utf8"),
    );
    portable.events[0].musicUrl = store.events[0].musicUrl;
    fs.writeFileSync(
      path.join(out, "publish-input.json"),
      JSON.stringify(portable),
    );
    const target = path.resolve("artifacts/publish-check");
    execFileSync(
      process.execPath,
      [
        "scripts/publish-data.mjs",
        path.join(out, "publish-input.json"),
        target,
      ],
      { stdio: "pipe" },
    );
    const published = JSON.parse(
      fs.readFileSync(path.join(target, "content/site.json"), "utf8"),
    );
    assert(
      published.events.every((e) =>
        e.recipients.every((r) =>
          r.photos.every((photo) => photo.startsWith("/media/")),
        ),
      ),
    );
    assert(published.events[0].musicUrl.startsWith("/media/"));
    for (const e of published.events) {
      for (const r of e.recipients) {
        for (const photo of r.photos)
          assert(fs.existsSync(path.join(target, photo)));
      }
      if (e.musicUrl) assert(fs.existsSync(path.join(target, e.musicUrl)));
    }
    assert(fs.statSync(path.join(target, "content/site.json")).size < 30000);
    report.push(
      "Publish CLI extracts embedded images/audio into actual media files; metadata JSON stays compact",
    );
    const c = await browser.newContext();
    await c.route("**/content/site.json", (r) =>
      r.fulfill({ json: published }),
    );
    await c.route("**/media/*", (r) =>
      r.fulfill({
        path: path.join(
          target,
          new URL(r.request().url()).pathname.replace("/lovely-gift/", "/"),
        ),
      }),
    );
    const page = await c.newPage();
    const failures = [];
    page.on("response", (r) => {
      if (r.status() >= 400) failures.push(r.url());
    });
    await page.goto("http://127.0.0.1:4173/lovely-gift/");
    await page.locator("#account").fill("linh");
    await page.getByRole("button", { name: "Tìm thiệp của tôi" }).click();
    await page
      .getByRole("button", { name: "Mở phong thư", exact: true })
      .click({ force: true });
    await page.getByRole("button", { name: "Mở sổ lời chúc" }).click();
    await page.locator(".book-cover").click();
    await page.locator(".book-spread").waitFor();
    await page.waitForTimeout(800);
    assert(
      await page
        .locator(".photo-page img")
        .evaluate((img) => img.naturalWidth > 0),
    );
    assert.deepEqual(failures, []);
    report.push("Extracted media image loads under Pages base path");
    await c.close();
    fs.writeFileSync(
      path.join(out, "media-report.json"),
      JSON.stringify({ checkedAt: new Date().toISOString(), report }, null, 2),
    );
    console.log(JSON.stringify({ report }, null, 2));
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
