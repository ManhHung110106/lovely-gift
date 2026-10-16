import type { Snapshot, GiftEvent, Recipient } from "./types";
import { readFile, download, downloadUrl } from "./storage";
import { wishesFor, videosFor } from "./model";
import { videoId } from "./media";

const MAX_EMBED_VIDEO_BYTES = 25 * 1024 * 1024; // 25 MB

async function getVideoInfo(url: string | undefined): Promise<{
  size: number;
  ext: string;
}> {
  if (!url || videoId(url)) return { size: 0, ext: "" };
  if (url.startsWith("data:")) {
    const extMatch = /^data:video\/([a-zA-Z0-9]+);/i.exec(url);
    const ext = extMatch ? extMatch[1].toLowerCase() : "mp4";
    return { size: Math.round(url.length * 0.75), ext };
  }
  const extMatch = /\.(mp4|webm|ogg|mov|m4v|mkv)$/i.exec(url);
  const ext = extMatch ? extMatch[1].toLowerCase() : "mp4";
  try {
    const head = await fetch(url, { method: "HEAD" });
    if (head.ok) {
      const len = head.headers.get("content-length");
      if (len) return { size: parseInt(len, 10), ext };
    }
  } catch {}
  try {
    const rangeRes = await fetch(url, { headers: { Range: "bytes=0-0" } });
    if (rangeRes.ok) {
      const cr = rangeRes.headers.get("content-range");
      if (cr) {
        const match = cr.match(/\/(\d+)$/);
        if (match) return { size: parseInt(match[1], 10), ext };
      }
      const len = rangeRes.headers.get("content-length");
      if (len) return { size: parseInt(len, 10), ext };
    }
  } catch {}
  return { size: 0, ext };
}

export async function exportGift(event: GiftEvent, recipientId: string) {
  const person = event.recipients.find((r) => r.id === recipientId);
  if (!person) throw new Error("Không tìm thấy người nhận.");

  const embed = async (url: string) => {
    if (!url) return "";
    if (url.startsWith("data:")) return url;
    const response = await fetch(url);
    if (!response.ok)
      throw new Error(
        "Không tải được một tài nguyên. Hãy kiểm tra ảnh/nhạc/video rồi thử lại.",
      );
    return readFile(await response.blob());
  };

  const downloads: Array<{ url: string; name: string }> = [];
  const processedVideos = new Map<string, string>();

  const processVideo = async (url: string | undefined, baseName: string) => {
    if (!url) return "";
    if (videoId(url)) return url;
    if (processedVideos.has(url)) return processedVideos.get(url)!;

    const info = await getVideoInfo(url);
    const ext = info.ext || "mp4";

    // Video nhỏ (<= 25MB): nhúng trực tiếp Base64 vào file HTML
    if (info.size > 0 && info.size <= MAX_EMBED_VIDEO_BYTES) {
      if (url.startsWith("data:")) {
        processedVideos.set(url, url);
        return url;
      }
      try {
        const res = await fetch(url);
        if (res.ok) {
          const blob = await res.blob();
          const base64 = await readFile(blob);
          processedVideos.set(url, base64);
          return base64;
        }
      } catch {}
    }

    // Video lớn (> 25MB, hoặc tệp video từ server):
    // Tải tệp gốc về máy và đặt đường dẫn tương đối trong thiệp
    const fileName = `${baseName}.${ext}`;
    downloads.push({ url, name: fileName });
    const localRef = `./${fileName}`;
    processedVideos.set(url, localRef);
    return localRef;
  };

  const activeVideos = videosFor(event, person);
  const needsCommon = activeVideos.some((v) => v.kind === "common");
  const needsPrivate = activeVideos.some((v) => v.kind === "private");

  const embeddedPersonVideo =
    needsPrivate && person.videoUrl
      ? await processVideo(
          person.videoUrl,
          `lovely-gift-${event.id}-${person.id}-video`,
        )
      : undefined;

  const embeddedCommonVideo =
    needsCommon && event.videoUrl
      ? await processVideo(
          event.videoUrl,
          `lovely-gift-${event.id}-video-chung`,
        )
      : "";

  const recipient: Recipient = {
    ...person,
    photos: await Promise.all(person.photos.map(embed)),
    videoUrl: embeddedPersonVideo,
  };

  const snapshot: Snapshot = {
    event: {
      ...event,
      recipients: [recipient],
      wishes: wishesFor(event, recipientId),
      musicUrl: event.musicUrl ? await embed(event.musicUrl) : "",
      videoUrl: embeddedCommonVideo,
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

  const serialized = JSON.stringify(snapshot).replace(
    /[<\u2028\u2029]/g,
    (c) => (c === "<" ? "\\u003c" : c === "\u2028" ? "\\u2028" : "\\u2029"),
  );

  const title = person.name.replace(/[<>&"']/g, "");
  const htmlBlob = new Blob(
    [
      '<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Gửi ',
      title,
      ' · Lovely Gift</title><style>',
      css.replace(/<\/style/gi, "<\\/style"),
      '</style></head><body><div id="root"></div><script>window.__GIFT_SNAPSHOT__=',
      serialized,
      ';</script><script>',
      js.replace(/<\/script/gi, "<\\/script"),
      '</script></body></html>',
    ],
    { type: "text/html;charset=utf-8" },
  );

  download(htmlBlob, `lovely-gift-${event.id}-${person.id}.html`);

  if (downloads.length > 0) {
    downloads.forEach((dl, idx) => {
      setTimeout(() => {
        downloadUrl(dl.url, dl.name);
      }, 400 * (idx + 1));
    });
  }

  return {
    hasExternalVideo: downloads.length > 0,
    videoFiles: downloads.map((d) => d.name),
  };
}
