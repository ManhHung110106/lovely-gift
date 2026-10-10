const { chromium } = require("../tools/mcp/node_modules/playwright");
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const out = path.resolve("artifacts/qa");
fs.mkdirSync(out, { recursive: true });
(async () => {
  const browser = await chromium.launch({ headless: true, channel: "msedge" });
  const report = [];
  const errors = [];
  try {
    const context = await browser.newContext({
      acceptDownloads: true,
      viewport: { width: 1440, height: 1000 },
    });
    await require("./qa-admin-helper.cjs").prepareAdmin(context);
    const p = await context.newPage();
    p.on("pageerror", (e) => errors.push(e.message));
    await p.goto("http://127.0.0.1:5173/?admin=1");
    await p.getByRole("heading", { name: "Tổng quan", exact: true }).waitFor();
    await p
      .getByRole("button", { name: "Người nhận", exact: false })
      .first()
      .click();
    await p.getByRole("button", { name: "Thêm người nhận" }).click();
    await p.getByLabel("Tên hiển thị", { exact: true }).fill("Linh trùng");
    await p.getByLabel("Tên truy cập").fill(" LINH ");
    await p.getByRole("button", { name: "Lưu người nhận" }).click();
    await p
      .getByRole("status")
      .filter({ hasText: "Tên truy cập đã được dùng" })
      .waitFor();
    await p
      .getByRole("dialog")
      .getByRole("button", { name: "Đóng", exact: true })
      .click();
    report.push("Duplicate account rejected");
    await p
      .getByRole("button", { name: "Người nhận", exact: false })
      .first()
      .click();
    const linh = p
      .locator(".recipient-card")
      .filter({ has: p.getByRole("heading", { name: "Linh", exact: true }) });
    await linh.getByRole("button", { name: "Chỉnh sửa", exact: true }).click();
    await p
      .locator(".image-upload input")
      .setInputFiles({
        name: "memory.png",
        mimeType: "image/png",
        buffer: await p.screenshot(),
      });
    await p.getByRole("button", { name: "Gỡ ảnh 5", exact: true }).waitFor();
    await p.getByRole("button", { name: "Lưu người nhận" }).click();
    report.push("Photo upload saved to recipient");
    await linh.getByRole("button", { name: "Chỉnh sửa", exact: true }).click();
    await p.getByLabel("Tên hiển thị", { exact: true }).fill("Linh vừa lưu");
    await p.getByLabel("Video YouTube riêng", { exact: false }).fill("https://youtu.be/recipient01");
    await p.getByRole("button", { name: "Lưu người nhận" }).click();
    await p.getByRole("button", { name: "Xem thiệp Linh vừa lưu", exact: true }).click();
    await p.getByRole("button", { name: "Về admin", exact: false }).click();
    await p.getByRole("heading", { name: "Tổng quan", exact: true }).waitFor();
    await p.reload();
    await p.getByRole("button", { name: "Người nhận", exact: false }).first().click();
    await p.getByRole("heading", { name: "Linh vừa lưu", exact: true }).waitFor();
    await p.locator(".recipient-card").filter({ has: p.getByRole("heading", { name: "Linh vừa lưu", exact: true }) }).getByRole("button", {name:"Chỉnh sửa",exact:true}).click();
    assert.equal(await p.getByLabel("Video YouTube riêng", {exact:false}).inputValue(), "https://youtu.be/recipient01");
    await p.getByRole("dialog").getByRole("button", {name:"Đóng",exact:true}).click();
    report.push("Immediate preview preserves the latest edit across admin reload");
    await p
      .getByRole("navigation")
      .getByRole("button", { name: "Lời chúc", exact: true })
      .click();
    await p.getByRole("button", { name: "Viết lời chúc" }).click();
    await p.getByLabel("Người gửi", { exact: true }).fill("QA");
    await p.getByLabel("Nội dung").fill(Array(501).fill("thương").join(" "));
    assert.equal(
      await p.getByRole("button", { name: "Lưu lời chúc" }).isDisabled(),
      true,
    );
    await p.getByLabel("Nội dung").fill("Một lời chúc mới từ QA 🌷");
    await p.getByRole("button", { name: "Lưu lời chúc" }).click();
    await p.getByText("Một lời chúc mới từ QA 🌷", { exact: true }).waitFor();
    report.push("Manual wishes and 500-word boundary");
    await p
      .getByRole("button", { name: "Nhập từ Sheets", exact: true })
      .click();
    const file =
      'wish_id,recipient_id,sender_name,message,order\nqa-1,linh,QA,"Nội dung CSV, có dấu phẩy 🌸",1\nqa-2,mai,,Chúc Mai vui,2';
    await p
      .getByLabel("Chọn bảng CSV")
      .setInputFiles({
        name: "wishes.csv",
        mimeType: "text/csv",
        buffer: Buffer.from(file),
      });
    await p.getByRole("button", { name: "Áp dụng 2 lời chúc" }).click();
    await p
      .getByRole("status")
      .filter({ hasText: "Đã nhập 2 lời chúc" })
      .waitFor();
    await p
      .getByLabel("Chọn bảng CSV")
      .setInputFiles({
        name: "wishes.csv",
        mimeType: "text/csv",
        buffer: Buffer.from(
          file.replace("Nội dung CSV, có dấu phẩy 🌸", "Cập nhật 🌸"),
        ),
      });
    await p.getByLabel("Cách nhập").selectOption("update");
    await p.getByRole("button", { name: "Áp dụng 2 lời chúc" }).click();
    await p
      .getByRole("navigation")
      .getByRole("button", { name: "Lời chúc", exact: true })
      .click();
    assert.equal(await p.locator(".wish-list article").count(), 2);
    await p.getByText("Cập nhật 🌸", { exact: true }).waitFor();
    report.push("CSV replace/update without duplicate rows");
    await p
      .getByRole("button", { name: "Nhập từ Sheets", exact: true })
      .click();
    await p
      .getByRole("button", { name: "Người nhận", exact: true })
      .last()
      .click();
    await p
      .getByLabel("Chọn bảng CSV")
      .setInputFiles({
        name: "recipients.csv",
        mimeType: "text/csv",
        buffer: Buffer.from("recipient_id,name,account\nngoc,Ngọc,ngoc"),
      });
    await p.getByRole("button", { name: "Kiểm tra và nhập danh sách" }).click();
    await p
      .getByRole("status")
      .filter({ hasText: "Đã nhập 1 người nhận" })
      .waitFor();
    report.push("Recipient CSV import");
    await p.getByRole("button", { name: "Sự kiện", exact: true }).click();
    await p.getByRole("button", { name: "Sao chép", exact: true }).click();
    await p.getByLabel("Dịp chúc mừng", { exact: true }).fill("Sinh nhật");
    await p.getByRole("button", { name: "Chọn hiện hành" }).click();
    await p
      .getByRole("button", { name: "Lưu & xuất bản", exact: true })
      .click();
    const downloading = p.waitForEvent("download");
    await p.getByRole("button", { name: "Xuất gói dữ liệu" }).click();
    const download = await downloading;
    const target = path.join(out, "admin-export.json");
    await download.saveAs(target);
    const store = JSON.parse(fs.readFileSync(target, "utf8"));
    assert.equal(store.events.length, 2);
    assert.notEqual(store.activeEventId, "women-2026");
    assert(
      store.events.every((e) =>
        e.recipients.every((r) =>
          r.photos.every((photo) => photo.startsWith("data:")),
        ),
      ),
    );
    assert.equal(store.isDemo, false);
    report.push("Event copy, active event selection, portable backup");
    await p.locator(".restore-label input").setInputFiles(target);
    await p.getByRole("status").filter({ hasText: "Đã khôi phục" }).waitFor();
    await p.getByText("Bản nháp đã lưu trên máy", { exact: true }).waitFor();
    await p.reload();
    await p.getByLabel("Chọn sự kiện để chỉnh sửa").waitFor();
    assert.equal(
      await p.getByLabel("Chọn sự kiện để chỉnh sửa").inputValue(),
      store.activeEventId,
    );
    report.push("Backup restore persists after reload");
    await context.close();
    const fixture = JSON.parse(
      fs.readFileSync("public/content/site.json", "utf8"),
    );
    fixture.events[0].recipients = Array.from({ length: 20 }, (_, i) => ({
      id: "p" + i,
      account: "p" + i,
      name: "Bạn " + i,
      photos: ["data:image/svg+xml;base64," + Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="240" height="320"><rect width="240" height="320" fill="hsl(${i * 17},60%,75%)"/><text x="25" y="170" font-size="30">Recipient ${i}</text></svg>`).toString("base64")],
    }));
    fixture.events[0].wishes = Array.from({ length: 20 }, (_, i) => ({
      id: "w" + i,
      recipientId: "p" + i,
      sender: "QA",
      message: "Lời chúc riêng cho bạn " + i,
      order: 1,
    }));
    const start = Date.now();
    const loads = [];
    await Promise.all(
      Array.from({ length: 15 }, async (_, i) => {
        const c = await browser.newContext();
        await c.route("**/content/site.json", (route) =>
          route.fulfill({ json: fixture }),
        );
        const page = await c.newPage();
        page.on("pageerror", (e) => errors.push(e.message));
        await page.goto("http://127.0.0.1:4173/lovely-gift/");
        await page.locator("#account").fill("p" + i);
        await page.getByRole("button", { name: "Tìm thiệp của tôi" }).click();
        await page
          .getByRole("heading")
          .filter({ hasText: "Bạn " + i })
          .waitFor();
        await page
          .getByRole("button", { name: "Mở phong thư", exact: true })
          .click({ force: true });
        await page.getByRole("button", { name: "Mở sổ lời chúc" }).click();
        await page.locator(".book-cover").click();
    await page.locator(".book-spread").waitFor();
        await page
          .getByText("Lời chúc riêng cho bạn " + i, { exact: true })
          .waitFor();
        const image = page.locator(".photo-page img");
        assert.equal(await image.getAttribute("src"), fixture.events[0].recipients[i].photos[0]);
        await image.evaluate(img => img.decode());
        loads.push(await page.evaluate(() => ({
          transferBytes: performance.getEntriesByType("resource").reduce((sum, entry) => sum + entry.transferSize, 0),
          encodedBytes: performance.getEntriesByType("resource").reduce((sum, entry) => sum + entry.encodedBodySize, 0),
        })));
        await c.close();
      }),
    );
    report.push(
      `15 concurrent browser sessions: passed (${Date.now() - start}ms on local test host)`,
    );
    for (let i = 15; i < 20; i++) {
      const c = await browser.newContext();
      await c.route("**/content/site.json", (route) =>
        route.fulfill({ json: fixture }),
      );
      const page = await c.newPage();
      await page.goto("http://127.0.0.1:4173/lovely-gift/");
      await page.locator("#account").fill("p" + i);
      await page.getByRole("button", { name: "Tìm thiệp của tôi" }).click();
      await page
        .getByRole("heading")
        .filter({ hasText: "Bạn " + i })
        .waitFor();
      await page
        .getByRole("button", { name: "Mở phong thư", exact: true })
        .click({ force: true });
      await page.getByRole("button", { name: "Mở sổ lời chúc" }).click();
      await page.locator(".book-cover").click();
    await page.locator(".book-spread").waitFor();
      await page
        .getByText("Lời chúc riêng cho bạn " + i, { exact: true })
        .waitFor();
      const image = page.locator(".photo-page img");
      assert.equal(await image.getAttribute("src"), fixture.events[0].recipients[i].photos[0]);
      await image.evaluate(img => img.decode());
      await c.close();
    }
    report.push("20 recipients verified against their own photos and wish content");
    assert.deepEqual(errors, []);
    fs.writeFileSync(
      path.join(out, "admin-report.json"),
      JSON.stringify(
        { checkedAt: new Date().toISOString(), report, errors, productionResourceLoads: loads },
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
