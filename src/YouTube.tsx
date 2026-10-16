import { useEffect, useRef, useState } from "react";
import { Play, Folder, UploadCloud } from "lucide-react";
import { videoId, isVideoFile } from "./media";
export { videoId, isVideoFile } from "./media";

export function YouTube({
  url,
  onPlaying,
  onEnded,
}: {
  url: string;
  onPlaying: (playing: boolean) => void;
  onEnded?: () => void;
}) {
  const holder = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const callback = useRef(onPlaying);
  callback.current = onPlaying;
  const ended = useRef(onEnded);
  ended.current = onEnded;
  const [blocked, setBlocked] = useState(false);
  const [localSrc, setLocalSrc] = useState<string | null>(null);
  const isYt = Boolean(videoId(url));

  useEffect(() => {
    setLocalSrc(null);
    setBlocked(false);
  }, [url]);

  useEffect(() => {
    return () => {
      if (localSrc && localSrc.startsWith("blob:")) {
        URL.revokeObjectURL(localSrc);
      }
    };
  }, [localSrc]);

  useEffect(() => {
    if (!isYt) {
      return () => {
        callback.current(false);
      };
    }
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
          onStateChange: (e: any) => {
            callback.current(e.data === 1);
            if (e.data === 0) ended.current?.();
          },
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
  }, [url, isYt]);

  if (!isYt) {
    const activeSrc = localSrc || url;

    const handleFileSelect = (file: File) => {
      if (
        file &&
        (file.type.startsWith("video/") ||
          /\.(mp4|webm|ogg|mov|mkv)$/i.test(file.name))
      ) {
        if (localSrc && localSrc.startsWith("blob:")) {
          URL.revokeObjectURL(localSrc);
        }
        const blobUrl = URL.createObjectURL(file);
        setLocalSrc(blobUrl);
        setBlocked(false);
      }
    };

    return (
      <div
        className="video-frame"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const file = e.dataTransfer.files?.[0];
          if (file) handleFileSelect(file);
        }}
      >
        <video
          ref={videoRef}
          key={activeSrc}
          src={activeSrc}
          controls
          playsInline
          autoPlay
          onPlay={() => callback.current(true)}
          onPause={() => callback.current(false)}
          onEnded={() => {
            callback.current(false);
            ended.current?.();
          }}
          onError={() => setBlocked(true)}
        />
        {blocked && (
          <div className="video-fallback-overlay">
            <p className="fallback-title">
              <Folder size={18} /> Video kỷ niệm kèm theo thiệp
            </p>
            <p className="fallback-desc">
              Nếu video chưa phát tự động do bảo mật tệp cục bộ của trình duyệt, bạn hãy chọn tệp video đã tải về máy để xem ngay:
            </p>
            <label className="fallback-pick-button">
              <UploadCloud size={16} /> Chọn tệp video trên máy
              <input
                type="file"
                accept="video/*"
                style={{ display: "none" }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelect(file);
                }}
              />
            </label>
            <span className="fallback-drag-hint">Hoặc kéo thả tệp video vào đây</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="video-frame">
      <div ref={holder} />
      {blocked && (
        <p className="video-hint">
          <Play size={14} /> Chạm nút phát trong video. Nếu video không khả
          dụng, hãy kiểm tra kết nối hoặc liên hệ người gửi.
        </p>
      )}
    </div>
  );
}
