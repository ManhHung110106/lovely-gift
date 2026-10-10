import Papa from "papaparse";
import { videoId } from "./media.ts";
import type { GiftEvent, GiftStore, Recipient, Wish } from "./types.ts";
export const normalize = (s: string) =>
  s.normalize("NFC").trim().toLocaleLowerCase("vi");
export const wordCount = (s: string) =>
  s.trim().split(/\s+/u).filter(Boolean).length;
export const wishesFor = (event: GiftEvent, id: string) =>
  event.wishes
    .filter((w) => w.recipientId === id)
    .sort((a, b) => a.order - b.order);
export const uid = () => crypto.randomUUID();
export function validateStore(input: unknown): string[] {
  const errors: string[] = [];
  const store = input as GiftStore;
  if (!store || store.version !== 1 || !Array.isArray(store.events))
    return ["Gói dữ liệu không đúng định dạng phiên bản 1."];
  if (
    !store.events.length ||
    !store.events.some((e) => e && e.id === store.activeEventId)
  )
    errors.push("Thiếu sự kiện hiện hành.");
  const ids = new Set<string>();
  for (const e of store.events) {
    if (!e || typeof e !== "object") {
      errors.push("Sự kiện không hợp lệ.");
      continue;
    }
    if (typeof e.id !== "string" || !e.id || ids.has(e.id))
      errors.push("Mã sự kiện thiếu hoặc bị trùng.");
    ids.add(e.id);
    if (
      typeof e.title !== "string" ||
      !e.title ||
      typeof e.occasion !== "string" ||
      !e.occasion ||
      !/^\d{4}-\d{2}-\d{2}$/.test(e.date) ||
      !["rose", "lavender"].includes(e.theme) ||
      typeof e.intro !== "string" ||
      typeof e.musicUrl !== "string" ||
      typeof e.videoUrl !== "string"
    )
      errors.push("Thông tin sự kiện không đầy đủ.");
    if (typeof e.videoUrl === "string" && e.videoUrl && !videoId(e.videoUrl))
      errors.push("Video phải là đường dẫn YouTube hợp lệ.");
    if (!Array.isArray(e.recipients) || !Array.isArray(e.wishes)) {
      errors.push("Danh sách người nhận/lời chúc không hợp lệ.");
      continue;
    }
    const accounts = new Set<string>();
    const people = new Set<string>();
    const wishIds = new Set<string>();
    for (const r of e.recipients) {
      if (!r || typeof r !== "object") {
        errors.push("Người nhận không hợp lệ.");
        continue;
      }
      if (
        typeof r.account !== "string" ||
        !r.account.trim() ||
        accounts.has(normalize(r.account))
      )
        errors.push("Tên truy cập thiếu hoặc bị trùng.");
      else accounts.add(normalize(r.account));
      if (
        typeof r.id !== "string" ||
        !r.id ||
        people.has(r.id) ||
        typeof r.name !== "string" ||
        !r.name.trim() ||
        !Array.isArray(r.photos) ||
        r.photos.some(
          (p) =>
            typeof p !== "string" ||
            !/^(data:image\/(png|jpeg|webp|gif|svg\+xml);|https?:\/\/|\.?\.?\/|\/)/.test(
              p,
            ),
        )
      )
        errors.push("Người nhận hoặc ảnh không hợp lệ.");
      people.add(r.id);
    }
    for (const w of e.wishes) {
      if (!w || typeof w !== "object") {
        errors.push("Lời chúc không hợp lệ.");
        continue;
      }
      if (
        typeof w.id !== "string" ||
        !w.id ||
        wishIds.has(w.id) ||
        !people.has(w.recipientId) ||
        typeof w.sender !== "string" ||
        typeof w.message !== "string" ||
        !w.message.trim() ||
        wordCount(w.message) > 500 ||
        !Number.isFinite(w.order)
      )
        errors.push(
          "Lời chúc bị trùng mã, thiếu người nhận, trống hoặc quá 500 từ.",
        );
      wishIds.add(w.id);
    }
  }
  return [...new Set(errors)];
}
export interface ImportPreview {
  rows: Wish[];
  errors: string[];
  headers: string[];
}
export function parseWishes(
  csv: string,
  recipients: Recipient[],
  mapping?: {
    recipient: string;
    sender: string;
    message: string;
    id: string;
    order: string;
  },
): ImportPreview {
  const parsed = Papa.parse<Record<string, string>>(csv, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (h) => h.replace(/^\uFEFF/, "").trim(),
  });
  const headers = parsed.meta.fields || [];
  const rows: Wish[] = [];
  const errors = parsed.errors.map(
    (e) => `Dòng ${(e.row ?? 0) + 2}: ${e.message}`,
  );
  const m = mapping || {
    recipient:
      headers.find((h) =>
        /^(recipient_id|người nhận|tên người nhận)$/i.test(h),
      ) || "",
    sender:
      headers.find((h) => /^(sender_name|người gửi|tên người gửi)$/i.test(h)) ||
      "",
    message: headers.find((h) => /^(message|nội dung)$/i.test(h)) || "",
    id: "wish_id",
    order: "order",
  };
  if (!m.recipient || !m.message)
    errors.push("Chọn cột người nhận và nội dung.");
  const seen = new Set<string>();
  parsed.data.forEach((r, i) => {
    const target = normalize(r[m.recipient] || "");
    const byId = recipients.filter((p) => normalize(p.id) === target);
    const byAccount = recipients.filter((p) => normalize(p.account) === target);
    const matches = byId.length
      ? byId
      : byAccount.length
        ? byAccount
        : recipients.filter((p) => normalize(p.name) === target);
    const message = r[m.message]?.trim() || "";
    const id = r[m.id]?.trim() || `import-${i + 1}`;
    if (matches.length !== 1)
      errors.push(`Dòng ${i + 2}: người nhận không tồn tại hoặc tên bị trùng.`);
    if (!message || wordCount(message) > 500)
      errors.push(`Dòng ${i + 2}: nội dung trống hoặc quá 500 từ.`);
    if (seen.has(id)) errors.push(`Dòng ${i + 2}: mã lời chúc bị trùng.`);
    seen.add(id);
    if (matches.length === 1 && message && wordCount(message) <= 500)
      rows.push({
        id,
        recipientId: matches[0].id,
        sender: r[m.sender]?.trim() || "",
        message,
        order: Number(r[m.order]) || i + 1,
      });
  });
  return { rows, errors, headers };
}
export function applyWishes(
  old: Wish[],
  incoming: Wish[],
  mode: "replace" | "update",
) {
  if (mode === "replace") return incoming;
  const merged = new Map(old.map((w) => [w.id, w]));
  incoming.forEach((w) => merged.set(w.id, w));
  return [...merged.values()];
}
export function bookPages(wishes: Wish[]) {
  return wishes.flatMap((w) => {
    const words = w.message.split(/\s+/u);
    const pages = [];
    for (let i = 0; i < words.length; i += 55)
      pages.push({
        ...w,
        message: words.slice(i, i + 55).join(" "),
        continued: i > 0,
      });
    return pages;
  });
}
