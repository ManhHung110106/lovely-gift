import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { validateStore } from "./model";
import "./styles.css";
import type { GiftStore } from "./types";
async function boot() {
  let store: GiftStore;
  if (window.__GIFT_SNAPSHOT__) {
    const e = window.__GIFT_SNAPSHOT__.event;
    store = { version: 1, activeEventId: e.id, events: [e] };
  } else {
    try {
      const r = await fetch(import.meta.env.BASE_URL + "content/site.json");
      if (!r.ok) throw new Error("Không tải được sự kiện.");
      const data = await r.json();
      const errors = validateStore(data);
      if (errors.length) throw new Error(errors.join(" "));
      store = data;
      const prefixMedia = (url: string | undefined) =>
        url && (url.startsWith("/demo/") || url.startsWith("/media/"))
          ? import.meta.env.BASE_URL + url.slice(1)
          : url;

      store.events.forEach((e) => {
        if (e.videoUrl) e.videoUrl = prefixMedia(e.videoUrl) || "";
        if (e.musicUrl) e.musicUrl = prefixMedia(e.musicUrl) || "";
        e.recipients.forEach((p) => {
          p.photos = p.photos.map((url) => prefixMedia(url) || url);
          if (p.videoUrl) p.videoUrl = prefixMedia(p.videoUrl);
        });
      });
    } catch (e) {
      console.error(e);
      document.getElementById("root")!.textContent =
        "Không thể tải món quà. Vui lòng tải lại trang hoặc liên hệ người gửi.";
      return;
    }
  }
  createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <App store={store} adminEnabled={import.meta.env.DEV} />
    </React.StrictMode>,
  );
}
void boot();
