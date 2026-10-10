import { useEffect, useRef, useState } from "react";
import { Play } from "lucide-react";
import { videoId } from "./media";
export { videoId } from "./media";
export function YouTube({
  url,
  onPlaying,
}: {
  url: string;
  onPlaying: (playing: boolean) => void;
}) {
  const holder = useRef<HTMLDivElement>(null);
  const callback = useRef(onPlaying);
  callback.current = onPlaying;
  const [blocked, setBlocked] = useState(false);
  useEffect(() => {
    let player: any;
    let cancelled = false;
    const id = videoId(url);
    if (!id) return;
    const create = () => {
      if (cancelled || !holder.current || !window.YT?.Player) return;
      const child = document.createElement("div");
      holder.current.appendChild(child);
      player = new window.YT.Player(child, {
        videoId: id,
        playerVars: { playsinline: 1, rel: 0 },
        events: {
          onStateChange: (e: any) => callback.current(e.data === 1),
          onAutoplayBlocked: () => setBlocked(true),
          onError: () => setBlocked(true),
        },
      });
    };
    if (window.YT?.Player) create();
    else {
      const previous = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        previous?.();
        create();
      };
      if (!document.querySelector("script[data-youtube]")) {
        const s = document.createElement("script");
        s.src = "https://www.youtube.com/iframe_api";
        s.dataset.youtube = "true";
        document.head.appendChild(s);
      }
    }
    return () => {
      cancelled = true;
      player?.destroy();
      callback.current(false);
    };
  }, [url]);
  return (
    <div className="video-frame">
      <div ref={holder} />
      {blocked && (
        <p className="video-hint">
          <Play size={14} /> Chạm nút phát trong video. Nếu video không khả
          dụng, bạn vẫn có thể tiếp tục.
        </p>
      )}
    </div>
  );
}
