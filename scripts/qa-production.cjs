const { chromium } = require("../tools/mcp/node_modules/playwright");
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const { pathToFileURL } = require("node:url");
const output = path.resolve("artifacts/qa");
const base = process.env.QA_BASE_URL || "http://127.0.0.1:4173/lovely-gift/";
(async () => {
  const browser = await chromium.launch({ headless: true, channel: "msedge" });
  const report = [];
  const errors = [];
  try {
    const context = await browser.newContext({
      viewport: { width: 1365, height: 900 },
      acceptDownloads: true,
    });
    const p = await context.newPage();
    p.on("pageerror", (e) => errors.push(e.message));
    const failed = [];
    p.on("response", (r) => {
      if (r.status() >= 400) failed.push(r.url());
    });
    await p.goto(base + "?admin=1");
    await p.locator("#account").waitFor();
    assert.equal(
      await p.getByRole("button", { name: "Quản trị", exact: true }).count(),
      0,
    );
    await p.reload();
    await p.locator("#account").fill("linh");
    await p.getByRole("button", { name: "Tìm thiệp của tôi" }).click();
    assert.equal(await p.locator(".scene-progress").count(), 0);
    await p
      .getByRole("button", { name: "Mở phong thư", exact: true })
      .click({ force: true });
    await p.getByRole("button", { name: "Mở sổ lời chúc" }).click();
    await p.locator(".book-cover").click();
    await p.locator(".book-spread").waitFor();
    while (
      await p.getByRole("button", { name: "Trang tiếp", exact: true }).count()
    ) {
      await p.getByRole("button", { name: "Trang tiếp", exact: true }).click();
      await p.waitForTimeout(750);
    }
    await p
      .getByRole("button", { name: "Mở không gian kỷ niệm" })
      .click();
    assert.equal(await p.locator(".garden-dock").count(), 0);
    await p.locator(".garden-dock").waitFor();
    await p.waitForTimeout(900);
    await p.screenshot({ path: path.join(output, "production-garden.png") });
    const downloading = p.waitForEvent("download");
    await p.getByRole("button", { name: "Giữ lại món quà" }).click();
    await (await downloading).saveAs(path.join(output, "production-linh.html"));
    assert.deepEqual(failed, []);
    report.push(
      "GitHub Pages subpath, refresh, production admin exclusion, delayed dock and export: passed",
    );
    await context.close();
    const data = JSON.parse(
      fs.readFileSync("public/content/site.json", "utf8"),
    );
    data.events.push({
      ...structuredClone(data.events[0]),
      id: "birthday",
      occasion: "Sinh nhật",
      date: "2027-01-01",
    });
    data.activeEventId = "birthday";
    data.events[0].wishes = [
      {
        id: "long",
        recipientId: "linh",
        sender: "QA",
        order: 1,
        message: Array(500).fill("thương").join(" "),
      },
    ];
    data.events[0].recipients.push({
      id: "empty",
      name: "Bình",
      account: "binh",
      photos: [],
    });
    const archived = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    });
    await archived.route("**/content/site.json", (r) =>
      r.fulfill({ json: data }),
    );
    const a = await archived.newPage();
    a.on("pageerror", (e) => errors.push(e.message));
    await a.goto(base + "?event=women-2026");
    await a.locator("#account").fill("linh");
    await a.getByRole("button", { name: "Tìm thiệp của tôi" }).click();
    await a
      .getByRole("button", { name: "Mở phong thư", exact: true })
      .click({ force: true });
    await a.getByRole("button", { name: "Mở sổ lời chúc" }).click();
    await a.locator(".book-cover").click();
    await a.locator(".book-spread").waitFor();
    let words = 0,
      count = 0;
    do {
      await a.waitForTimeout(700);
      words += (await a.locator(".wish-text").innerText())
        .trim()
        .split(/\s+/).length;
      count++;
      assert(
        await a.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
      const overflow = await a
        .locator(".paper-page")
        .evaluate((e) => e.scrollHeight > e.clientHeight);
      assert.equal(overflow, false);
      if (
        !(await a
          .getByRole("button", { name: "Trang tiếp", exact: true })
          .count())
      )
        break;
      await a.getByRole("button", { name: "Trang tiếp", exact: true }).click();
      await a.waitForTimeout(750);
      await a.waitForTimeout(750);
    } while (count < 15);
    assert.equal(words, 500);
    report.push(
      "Archived event access and 500-word pagination on mobile: passed",
    );
    await a.goto(base + "?event=women-2026");
    await a.locator("#account").fill("binh");
    await a.getByRole("button", { name: "Tìm thiệp của tôi" }).click();
    await a
      .getByRole("button", { name: "Mở phong thư", exact: true })
      .click({ force: true });
    await a.getByRole("button", { name: "Mở sổ lời chúc" }).click();
    await a.locator(".book-cover").click();
    await a.locator(".book-spread").waitFor();
    await a
      .getByRole("button", { name: "Mở không gian kỷ niệm" })
      .click();
    await a.locator("canvas").waitFor();
    await a.waitForTimeout(2500);
    await a.screenshot({ path: path.join(output, "garden-mobile.png") });
    report.push(
      "Recipient with zero wishes/photos still completes experience: passed",
    );
    await archived.close();
    const video = await browser.newContext();
    const v = await video.newPage();
    await v.addInitScript(() => {
      window.__audioStates = [];
      const Original = window.AudioContext;
      window.AudioContext = class extends Original {
        async resume() {
          window.__audioStates.push("resume");
          return super.resume();
        }
        async suspend() {
          window.__audioStates.push("suspend");
          return super.suspend();
        }
      };
    });
    const videoData = JSON.parse(
      fs.readFileSync("public/content/site.json", "utf8"),
    );
    videoData.events[0].videoUrl = "https://youtu.be/aqz-KE-bpKQ";
    videoData.events[0].recipients[0].videoUrl = "https://youtu.be/recipient01";
    await video.route("**/content/site.json", (r) =>
      r.fulfill({ json: videoData }),
    );
    await video.route("https://www.youtube.com/iframe_api", (r) =>
      r.fulfill({
        contentType: "application/javascript",
        body: `window.YT={Player:class {constructor(el,opts){window.__ytOptions=opts;el.innerHTML='<button id="mock-play">Play video</button><button id="mock-end">End video</button>';el.querySelector('#mock-play').onclick=()=>opts.events.onStateChange({data:1});el.querySelector('#mock-end').onclick=()=>opts.events.onStateChange({data:0});}destroy(){}}};window.onYouTubeIframeAPIReady();`,
      }),
    );
    v.on("pageerror", (e) => errors.push(e.message));
    await v.goto(base);
    await v.locator("#account").fill("linh");
    await v.getByRole("button", { name: "Tìm thiệp của tôi" }).click();
    await v
      .getByRole("button", { name: "Mở phong thư", exact: true })
      .click({ force: true });
    assert.equal(await v.locator(".letter-date").count(), 0);
    assert.equal(await v.locator("#mock-play").count(), 0);
    await v.getByRole("button", { name: "Xem video dành cho bạn" }).click();
    assert.equal(await v.getByRole("button", { name: "Mở sổ lời chúc", exact: true }).count(), 0);
    await v.locator("#mock-play").click();
    assert.equal(await v.evaluate(() => window.__ytOptions.videoId), "recipient01");
    assert.equal(
      await v.evaluate(() => window.__audioStates.at(-1)),
      "suspend",
    );
    assert.equal(await v.getByRole("button", { name: "Mở sổ lời chúc", exact: true }).count(), 0);
    await v.evaluate(() => window.__ytOptions.events.onStateChange({data:2}));
    assert.equal(await v.getByRole("button", { name: "Mở sổ lời chúc", exact: true }).count(), 0);
    await v.locator("#mock-end").click();
    await v.getByRole("button", { name: "Mở sổ lời chúc" }).click();
    await v.waitForTimeout(300);
    assert.equal(await v.evaluate(() => window.__audioStates.at(-1)), "resume");
    report.push(
      "Separate greeting/video; book hidden until YouTube ENDED, still hidden on pause; audio pause/resume (mocked API): passed",
    );
    await v.locator(".book-cover").click();
    await v.locator(".book-spread").waitFor();
    while (await v.getByRole("button", {name:"Trang tiếp",exact:true}).count()) {
      await v.getByRole("button", {name:"Trang tiếp",exact:true}).click();
      await v.waitForTimeout(750);
    }
    await v.getByRole("button", {name:"Mở không gian kỷ niệm"}).click();
    await v.locator(".garden-dock").waitFor();
    const videoDownload = v.waitForEvent("download");
    await v.getByRole("button", {name:"Giữ lại món quà"}).click();
    const offlinePath = path.join(output,"youtube-offline.html");
    await (await videoDownload).saveAs(offlinePath);
    const offlineContext = await browser.newContext({offline:true});
    const offlinePage = await offlineContext.newPage();
    const offlineRequests=[];
    offlinePage.on("request", r => {if(/^https?:/.test(r.url()))offlineRequests.push(r.url());});
    offlinePage.on("pageerror", e=>errors.push(e.message));
    await offlinePage.goto(pathToFileURL(offlinePath).href);
    await offlinePage.getByRole("button",{name:"Mở phong thư",exact:true}).click({force:true});
    await offlinePage.getByRole("button",{name:"Mở sổ lời chúc",exact:true}).click();
    await offlinePage.locator(".book-cover").waitFor();
    assert.deepEqual(offlineRequests,[]);
    await offlineContext.close();
    report.push("Exported card with configured YouTube remains readable offline without external requests");
    await v.goto(base);
    await v.locator("#account").fill("mai");
    await v.getByRole("button", {name:"Tìm thiệp của tôi"}).click();
    await v.getByRole("button", {name:"Mở phong thư",exact:true}).click({force:true});
    await v.getByRole("button", {name:"Xem video dành cho bạn"}).click();
    await v.locator("#mock-play").waitFor();
    assert.equal(await v.evaluate(() => window.__ytOptions.videoId), "aqz-KE-bpKQ");
    report.push("Personal video takes priority; another recipient uses the event default video");
    await video.close();
    assert.deepEqual(errors, []);
    fs.writeFileSync(
      path.join(output, process.env.QA_BASE_URL ? "live-production-report.json" : "production-report.json"),
      JSON.stringify(
        { checkedAt: new Date().toISOString(), base, report, errors },
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
