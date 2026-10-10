const { chromium } = require("../tools/mcp/node_modules/playwright");
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");

(async () => {
  const browser = await chromium.launch({ headless: true, channel: "msedge" });
  const errors = [];
  const contexts = [];
  const started = Date.now();
  try {
    const pages = await Promise.all(Array.from({ length: 15 }, async (_, index) => {
      const context = await browser.newContext({ viewport: { width: 960, height: 720 } });
      contexts.push(context);
      await context.addInitScript(() => {
        window.__draws = 0;
        window.__contextLosses = 0;
        document.addEventListener("webglcontextlost", () => window.__contextLosses++, true);
        for (const type of [window.WebGLRenderingContext, window.WebGL2RenderingContext]) {
          for (const name of ["drawElements", "drawArrays"]) {
            const original = type.prototype[name];
            type.prototype[name] = function (...args) {
              window.__draws++;
              return original.apply(this, args);
            };
          }
        }
      });
      const page = await context.newPage();
      page.setDefaultTimeout(90000);
      page.on("pageerror", error => errors.push(`Session ${index}: ${error.message}`));
      await page.goto("http://127.0.0.1:4173/lovely-gift/");
      await page.locator("#account").fill(index % 2 ? "mai" : "linh");
      await page.getByRole("button", { name: "Tìm thiệp của tôi" }).click();
      await page.getByRole("button", { name: "Mở phong thư", exact: true }).click({ force: true });
      await page.getByRole("button", { name: "Tắt nhạc", exact: true }).click();
      await page.getByRole("button", { name: "Mở sổ lời chúc" }).click();
      await page.locator(".book-cover").click();
    await page.locator(".book-spread").waitFor();
      while (await page.getByRole("button", { name: "Trang tiếp", exact: true }).count()) {
        await page.getByRole("button", { name: "Trang tiếp", exact: true }).click();
      await page.waitForTimeout(750);
      await page.waitForTimeout(750);
      }
      await page.getByRole("button", { name: "Mở không gian kỷ niệm" }).click();
      await page.locator(".garden-dock").waitFor();
      await page.waitForFunction(() => window.__draws > 0);
      return page;
    }));
    const before = await Promise.all(pages.map(p => p.evaluate(() => window.__draws)));
    await pages[0].waitForTimeout(5000);
    const samples = await Promise.all(pages.map((p, i) => p.evaluate(before => ({
      canvases: document.querySelectorAll("canvas").length,
      drawCallsOverFiveSeconds: window.__draws - before,
      contextLosses: window.__contextLosses,
    }), before[i])));
    for (const sample of samples) {
      assert.equal(sample.canvases, 1);
      assert(sample.drawCallsOverFiveSeconds > 0);
      assert.equal(sample.contextLosses, 0);
    }
    assert.deepEqual(errors, []);
    const result = { checkedAt: new Date().toISOString(), elapsedMs: Date.now() - started,
      scope: "15 local production browser sessions, all gardens rendering simultaneously; this shares one machine GPU and does not measure real phone performance or remote hosting.", samples, errors };
    fs.mkdirSync("artifacts/qa", { recursive: true });
    fs.writeFileSync(path.resolve("artifacts/qa/concurrency-report.json"), JSON.stringify(result, null, 2));
    console.log(JSON.stringify(result, null, 2));
  } finally {
    await Promise.all(contexts.map(c => c.close()));
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
