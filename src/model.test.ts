import { describe, it, expect } from "vitest";
import {
  applyWishes,
  bookPages,
  normalize,
  parseWishes,
  validateStore,
  wordCount,
  videosFor,
} from "./model";
import { demo } from "./data";
describe("Recipient video sequence", () => {
  const event = { ...demo.events[0], videoUrl: "https://youtu.be/commonvideo" };
  const recipient = { ...event.recipients[0], videoUrl: "https://youtu.be/privatevid1" };
  it("defaults to common then private for existing recipients", () => {
    expect(videosFor(event, recipient).map(v => v.url)).toEqual([event.videoUrl, recipient.videoUrl]);
  });
  it("honors each recipient's common-only and private-only settings", () => {
    expect(videosFor(event, { ...recipient, videoMode: "common" }).map(v => v.kind)).toEqual(["common"]);
    expect(videosFor(event, { ...recipient, videoMode: "private" }).map(v => v.kind)).toEqual(["private"]);
    expect(videosFor(event, { ...recipient, videoMode: "both" }).map(v => v.kind)).toEqual(["common", "private"]);
  });
  it("handles missing videos without introducing empty playback steps", () => {
    expect(videosFor(event, { ...recipient, videoUrl: "", videoMode: "private" }).map(v => v.kind)).toEqual(["common"]);
    expect(videosFor({ ...event, videoUrl: "" }, recipient).map(v => v.kind)).toEqual(["private"]);
    expect(videosFor({ ...event, videoUrl: "" }, { ...recipient, videoMode: "common" })).toEqual([]);
    expect(videosFor({ ...event, videoUrl: "" }, { ...recipient, videoUrl: "" })).toEqual([]);
  });
  it("rejects unknown playback settings in imported data", () => {
    const store = structuredClone(demo);
    Object.assign(store.events[0].recipients[0], { videoMode: "invalid" });
    expect(validateStore(store)).toContain("Lựa chọn video của người nhận không hợp lệ.");
  });
});
describe("Recipient mapping and import", () => {
  it("accepts legacy recipients and validates each personal YouTube URL", () => {
    const store = structuredClone(demo);
    expect(validateStore(store)).toEqual([]);
    store.events[0].recipients[0].videoUrl = "https://youtu.be/recipient01";
    expect(validateStore(store)).toEqual([]);
    store.events[0].recipients[0].videoUrl = "javascript:alert(1)";
    expect(validateStore(store).join(" ")).toContain("Video riêng");
  });
  it("normalizes Vietnamese unicode, casing and surrounding space without stripping accents", () => {
    expect(normalize("  LÍNH ")).toBe("lính");
    expect(normalize("Linh")).not.toBe(normalize("Lính"));
  });
  it("reads quoted multiline wishes and emojis and maps exact recipient", () => {
    const p = parseWishes(
      'người gửi,nội dung,người nhận\nMinh,"Xin chào, bạn\nChúc bạn vui 🌷",Linh',
      demo.events[0].recipients,
    );
    expect(p.errors).toEqual([]);
    expect(p.rows[0].recipientId).toBe("linh");
    expect(p.rows[0].message).toContain("\n");
  });
  it("rejects ambiguous display names and nonexistent recipients", () => {
    const people = [
      { id: "a", name: "Linh", account: "a", photos: [] },
      { id: "b", name: "Linh", account: "b", photos: [] },
    ];
    expect(
      parseWishes("recipient_id,message\nLinh,Chúc vui", people).errors.length,
    ).toBeGreaterThan(0);
    expect(
      parseWishes("recipient_id,message\nmissing,Chúc vui", people).errors
        .length,
    ).toBeGreaterThan(0);
    expect(
      parseWishes("recipient_id,message\na,Chúc vui", people).errors,
    ).toEqual([]);
  });
  it("rejects duplicate wish ids and more than 500 words", () => {
    const message = Array(501).fill("thương").join(" ");
    const p = parseWishes(
      `wish_id,recipient_id,message\nx,linh,${message}\nx,linh,Hi`,
      demo.events[0].recipients,
    );
    expect(p.errors.some((e) => e.includes("500"))).toBe(true);
    expect(p.errors.some((e) => e.includes("trùng"))).toBe(true);
  });
  it("replaces and updates without duplicating wishes", () => {
    const a = demo.events[0].wishes.slice(0, 2);
    const updated = { ...a[0], message: "New" };
    expect(applyWishes(a, [updated], "replace")).toEqual([updated]);
    expect(applyWishes(a, [updated], "update")).toHaveLength(2);
    expect(applyWishes(a, [updated], "update")[0].message).toBe("New");
  });
});
describe("Published data invariants", () => {
  it("accepts demo and rejects duplicate accounts after normalization", () => {
    expect(validateStore(demo)).toEqual([]);
    const bad = structuredClone(demo);
    bad.events[0].recipients[1].account = " LINH ";
    expect(validateStore(bad)).toContain("Tên truy cập thiếu hoặc bị trùng.");
  });
  it("rejects wishes linked to deleted recipients", () => {
    const bad = structuredClone(demo);
    bad.events[0].recipients = [];
    expect(validateStore(bad).length).toBeGreaterThan(0);
  });
  it("handles malformed backup objects without throwing", () => {
    expect(
      validateStore({ version: 1, activeEventId: "x", events: [null] }).length,
    ).toBeGreaterThan(0);
    expect(validateStore({})).toHaveLength(1);
  });
  it("paginates 500 words without dropping words or authors", () => {
    const w = {
      ...demo.events[0].wishes[0],
      message: Array(500).fill("thương").join(" "),
    };
    const p = bookPages([w]);
    expect(p.length).toBeGreaterThan(1);
    expect(wordCount(p.map((p) => p.message).join(" "))).toBe(500);
    expect(p.every((p) => p.sender === w.sender)).toBe(true);
    expect(p[1].continued).toBe(true);
  });
});
