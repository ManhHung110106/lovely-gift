import type { Snapshot, GiftEvent } from "./types";
import { readFile, download } from "./storage";
import { wishesFor } from "./model";
export async function exportGift(event: GiftEvent, recipientId: string) {
  const person = event.recipients.find((r) => r.id === recipientId);
  if (!person) throw new Error("Không tìm thấy người nhận.");
  const embed = async (url: string) => {
    if (url.startsWith("data:")) return url;
    const response = await fetch(url);
    if (!response.ok)
      throw new Error(
        "Không tải được một tài nguyên. Hãy kiểm tra ảnh/nhạc rồi thử lại.",
      );
    return readFile(await response.blob());
  };
  const recipient = {
    ...person,
    photos: await Promise.all(person.photos.map(embed)),
  };
  const snapshot: Snapshot = {
    event: {
      ...event,
      recipients: [recipient],
      wishes: wishesFor(event, recipientId),
      musicUrl: event.musicUrl ? await embed(event.musicUrl) : "",
    },
    recipient,
  };
  const [js, css] = await Promise.all(
    ["offline-runtime.js", "offline-runtime.css"].map(async (f) => {
      const r = await fetch(import.meta.env.BASE_URL + f);
      if (!r.ok)
        throw new Error(
          "Chưa có bộ xuất thiệp. Hãy chạy npm run build:offline trước.",
        );
      return r.text();
    }),
  );
  const serialized = JSON.stringify(snapshot)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
  const title = person.name.replace(/[<>&"']/g, "");
  const html = `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Gửi ${title} · Lovely Gift</title><style>${css.replace(/<\/style/gi, "<\\/style")}</style></head><body><div id="root"></div><script>window.__GIFT_SNAPSHOT__=${serialized};</script><script>${js.replace(/<\/script/gi, "<\\/script")}</script></body></html>`;
  download(
    html,
    `lovely-gift-${event.id}-${person.id}.html`,
    "text/html;charset=utf-8",
  );
}
