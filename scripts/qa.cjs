const { chromium } = require("../tools/mcp/node_modules/playwright");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const assert = require("node:assert/strict");
const out = path.resolve("artifacts/qa");
fs.mkdirSync(out, { recursive: true });
(async () => {
  const browser = await chromium.launch({ headless: true, channel: "msedge" });
  const errors = [];
  const report = [];
  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
      acceptDownloads: true,
    });
    await require("./qa-admin-helper.cjs").prepareAdmin(context);
    const page = await context.newPage();
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("http://127.0.0.1:5173/", { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(900);
    await page.screenshot({
      path: path.join(out, "welcome-desktop.png"),
      fullPage: true,
    });
    await page.locator("#account").fill("wrong");
    await page.getByRole("button", { name: "Tìm thiệp của tôi" }).click();
    await page.getByRole("alert").waitFor();
    await page.locator("#account").fill(" LINH ");
    await page.getByRole("button", { name: "Tìm thiệp của tôi" }).click();
    await page
      .getByRole("button", { name: "Mở phong thư", exact: true })
      .waitFor();
    await page.waitForTimeout(900);
    await page.screenshot({
      path: path.join(out, "envelope.png"),
      fullPage: true,
    });
    await page
      .getByRole("button", { name: "Mở phong thư", exact: true })
      .click({ force: true });
    await page.getByRole("button", { name: "Mở sổ lời chúc" }).click();
    await page.locator(".book-cover").click();
    await page.locator(".book-spread").waitFor();
    await page.locator(".book-spread").waitFor();
    await page.waitForTimeout(900);
    await page.screenshot({
      path: path.join(out, "book-desktop.png"),
      fullPage: true,
    });
    while (
      await page
        .getByRole("button", { name: "Trang tiếp", exact: true })
        .count()
    ) {
      await page
        .getByRole("button", { name: "Trang tiếp", exact: true })
        .click();
      await page.waitForTimeout(750);
    }
    await page
      .getByRole("button", { name: "Mở không gian kỷ niệm" })
      .click();
    await page.locator("canvas").waitFor();
    await page
      .getByRole("button", { name: "Giữ lại món quà" })
      .waitFor({ timeout: 15000 });
    await page.waitForTimeout(900);
    await page.screenshot({
      path: path.join(out, "garden-desktop.png"),
      fullPage: true,
    });
    const box = await page.locator("canvas").boundingBox();
    await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.6);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.7, box.y + box.height * 0.55, {
      steps: 10,
    });
    await page.mouse.up();
    await page.mouse.wheel(0, 150);
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "Giữ lại món quà" }).click();
    const file = await download;
    const target = path.join(out, "linh.html");
    await file.saveAs(target);
    const html = fs.readFileSync(target, "utf8");
    assert(html.includes("window.__GIFT_SNAPSHOT__"));
    assert(!html.includes('"recipientId":"mai"'));
    const changed = JSON.parse(fs.readFileSync("public/content/site.json", "utf8"));
    changed.activeEventId = "replacement-event";
    changed.events = [{ ...changed.events[0], id: "replacement-event", recipients: [], wishes: [] }];
    await context.route("**/content/site.json", route => route.fulfill({ json: changed }));
    await page.reload();
    await page.locator("#account").fill("linh");
    await page.getByRole("button", { name: "Tìm thiệp của tôi" }).click();
    await page.getByRole("alert").waitFor();
    const offline = await browser.newContext({
      offline: true,
      viewport: { width: 1365, height: 900 },
    });
    const op = await offline.newPage();
    op.on("pageerror", (e) => errors.push("offline: " + e.message));
    const external = [];
    op.on("request", (r) => {
      if (/^https?:/.test(r.url())) external.push(r.url());
    });
    await op.goto(pathToFileURL(target).href);
    const snapshot = await op.evaluate(() => window.__GIFT_SNAPSHOT__);
    assert.equal(snapshot.recipient.id, "linh");
    assert(snapshot.event.wishes.every(w => w.recipientId === "linh"));
    await op
      .getByRole("button", { name: "Mở phong thư", exact: true })
      .click({ force: true });
    await op.getByRole("button", { name: "Mở sổ lời chúc" }).click();
    await op.locator(".book-cover").click();
    await op.locator(".book-spread").waitFor();
    while (
      await op.getByRole("button", { name: "Trang tiếp", exact: true }).count()
    ) {
      await op.getByRole("button", { name: "Trang tiếp", exact: true }).click();
      await op.waitForTimeout(750);
    }
    await op
      .getByRole("button", { name: "Mở không gian kỷ niệm" })
      .click();
    await op.locator("canvas").waitFor();
    await op.waitForTimeout(1500);
    await op.screenshot({ path: path.join(out, "offline-garden.png") });
    assert.equal(external.length, 0);
    await offline.close();
    report.push("Login, book, 3D orbit, download and offline HTML: passed");
    report.push("Downloaded card survives deletion of its recipient and replacement of the published event");
    await context.unroute("**/content/site.json");
    await page.goto("http://127.0.0.1:5173/?admin=1");
    await page
      .getByRole("heading", { name: "Tổng quan", exact: true })
      .waitFor();
    await page.waitForTimeout(900);
    await page.screenshot({
      path: path.join(out, "admin-desktop.png"),
      fullPage: true,
    });
    await page
      .getByRole("button", { name: "Người nhận", exact: false })
      .first()
      .click();
    await page.getByRole("button", { name: "Thêm người nhận" }).click();
    await page.getByLabel("Tên hiển thị", { exact: true }).fill("Ngọc");
    await page.getByLabel("Tên truy cập", { exact: false }).fill("ngoc");
    await page.getByRole("button", { name: "Lưu người nhận" }).click();
    await page.getByRole("heading", { name: "Ngọc", exact: true }).waitFor();
    await page.getByText("Bản nháp đã lưu trên máy", { exact: true }).waitFor();
    await page.reload();
    await page
      .getByRole("button", { name: "Người nhận", exact: false })
      .first()
      .click();
    await page.getByRole("heading", { name: "Ngọc", exact: true }).waitFor();
    report.push("Admin recipient creation + IndexedDB persistence: passed");
    const mobile = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    });
    const mp = await mobile.newPage();
    mp.on("pageerror", (e) => errors.push("mobile: " + e.message));
    await mp.goto("http://127.0.0.1:5173/");
    await mp.evaluate(() => document.fonts.ready);
    await mp.waitForTimeout(900);
    await mp.screenshot({
      path: path.join(out, "welcome-mobile.png"),
      fullPage: true,
    });
    assert(
      await mp.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    await mp.locator("#account").fill("an");
    await mp.getByRole("button", { name: "Tìm thiệp của tôi" }).click();
    await mp
      .getByRole("button", { name: "Mở phong thư", exact: true })
      .click({ force: true });
    await mp.getByRole("button", { name: "Mở sổ lời chúc" }).click();
    await mp.locator(".book-cover").click();
    await mp.locator(".book-spread").waitFor();
    await mp.waitForTimeout(900);
    await mp.screenshot({
      path: path.join(out, "book-mobile.png"),
      fullPage: true,
    });
    assert(
      await mp.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    report.push("Mobile 390px layout + recipient without photos: passed");
    await context.close();
    await mobile.close();
    assert.deepEqual(errors, []);
    fs.writeFileSync(
      path.join(out, "report.json"),
      JSON.stringify(
        { checkedAt: new Date().toISOString(), report, errors },
        null,
        2,
      ),
    );
    console.log(JSON.stringify({ report, errors }, null, 2));
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
