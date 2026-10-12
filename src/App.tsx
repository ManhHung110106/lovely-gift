import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Download,
  Heart,
  LoaderCircle,
  Mail,
  Music2,
  Sparkles,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import type { GiftEvent, GiftStore, Recipient } from "./types";
import { normalize, wishesFor, bookPages } from "./model";
import { Flower, Petals, Balloons } from "./Botanicals";
import { Garden } from "./Garden";
import { GiftAudio } from "./music";
import { YouTube } from "./YouTube";
import { exportGift } from "./export";
import { Admin } from "./Admin";
import { AdminLogin } from "./AdminLogin";
type Scene = "login" | "envelope" | "intro" | "video" | "book" | "garden";
export function App({
  store,
  adminEnabled = false,
}: {
  store: GiftStore;
  adminEnabled?: boolean;
}) {
  const params = new URLSearchParams(location.search);
  const snapshot = window.__GIFT_SNAPSHOT__;
  const [admin, setAdmin] = useState(
    adminEnabled && (params.get("admin") === "1" || /\/admin\/?$/.test(location.pathname)),
  );
  const [adminAuthenticated, setAdminAuthenticated] = useState(false);
  const [preview, setPreview] = useState<{
    event: GiftEvent;
    recipient: Recipient;
  } | null>(null);
  const event =
    preview?.event ||
    snapshot?.event ||
    store.events.find(
      (e) => e.id === (params.get("event") || store.activeEventId),
    );
  const [recipient, setRecipient] = useState<Recipient | null>(
    snapshot?.recipient || null,
  );
  const person = preview?.recipient || recipient;
  const videoUrl = person?.videoUrl || event?.videoUrl || "";
  const [scene, setScene] = useState<Scene>(snapshot ? "envelope" : "login");
  const [account, setAccount] = useState("");
  const [error, setError] = useState("");
  const [page, setPage] = useState(-1);
  const [turning, setTurning] = useState<"open" | "forward" | "backward" | null>(null);
  const turnTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (turnTimer.current) clearTimeout(turnTimer.current); }, []);
  const [unlocked, setUnlocked] = useState(false);
  const [dock, setDock] = useState(false);
  const [music, setMusic] = useState(false);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [videoEnded, setVideoEnded] = useState(false);
  const [audioError, setAudioError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const touch = useRef(0);
  const audio = useMemo(
    () => new GiftAudio(event?.musicUrl || ""),
    [event?.id, event?.musicUrl],
  );
  useEffect(() => () => audio.dispose(), [audio]);
  const wishes = event && person ? wishesFor(event, person.id) : [];
  const pages = bookPages(wishes);
  useEffect(() => {
    if (scene !== "garden") {
      setDock(false);
      return;
    }
    const timer = setTimeout(() => {
      setDock(true);
      setUnlocked(true);
      if (event && person)
        try {
          localStorage.setItem(`seen:${event.id}:${person.id}`, "1");
        } catch {}
    }, 5000);
    return () => clearTimeout(timer);
  }, [scene, event?.id, person?.id]);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 7000);
    return () => clearTimeout(t);
  }, [notice]);
  async function startMusic() {
    if (videoPlaying) {
      setMusic(true);
      return;
    }
    try {
      await audio.play();
      setMusic(true);
      setAudioError(false);
    } catch {
      setAudioError(true);
      setMusic(false);
    }
  }
  function toggleMusic() {
    if (music) {
      audio.pause();
      setMusic(false);
    } else void startMusic();
  }
  function login(e: React.FormEvent) {
    e.preventDefault();
    if (!event) return;
    const r = event.recipients.find(
      (r) => normalize(r.account) === normalize(account),
    );
    if (!r) {
      setError("Chưa tìm thấy thiệp. Bạn kiểm tra lại tên được gửi nhé.");
      return;
    }
    setRecipient(r);
    setError("");
    setScene("envelope");
    try {
      setUnlocked(localStorage.getItem(`seen:${event.id}:${r.id}`) === "1");
    } catch {}
  }
  async function save() {
    if (!event || !person) return;
    setBusy(true);
    try {
      await exportGift(event, person.id);
      setNotice(
        "Đã lưu món quà của bạn. Mở tệp HTML để xem lại bất cứ lúc nào.",
      );
    } catch (e) {
      setNotice((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function turnPage(target: number) {
    if (turning || target === page) return;
    setTurning(page < 0 ? "open" : target > page ? "forward" : "backward");
    turnTimer.current = setTimeout(() => {
      setPage(target);
      setTurning(null);
    }, matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 700);
  }
  const nextPage = () => turnPage(Math.min(page + 1, Math.max(pages.length - 1, 0)));
  const prevPage = () => turnPage(Math.max(-1, page - 1));
  if (admin && adminEnabled && !adminAuthenticated)
    return <AdminLogin onAuthenticated={() => setAdminAuthenticated(true)} />;
  if (admin && adminEnabled)
    return (
      <Admin
        published={store}
        onLogout={() => { setAdminAuthenticated(false); setAdmin(true); setPreview(null); history.replaceState(null, "", import.meta.env.BASE_URL + "admin"); }}
        onExit={() => { setAdmin(false); history.replaceState(null, "", import.meta.env.BASE_URL); }}
        onPreview={(event, recipient) => {
          setPreview({ event, recipient });
          setScene("envelope");
          setPage(-1);
          setUnlocked(false);
          setAdmin(false);
        }}
      />
    );
  if (!event)
    return (
      <main className="missing">
        <Mail size={36} />
        <h1>Món quà đang được chuẩn bị</h1>
        <p>Sự kiện này chưa có hoặc đã được gỡ xuống.</p>
        <a href={import.meta.env.BASE_URL}>Về trang chủ</a>
      </main>
    );
  return (
    <main className={`gift-app theme-${event.theme} scene-${scene}`}>
      <Petals />
      <header className="site-header">
        <a
          className="brand"
          href={import.meta.env.BASE_URL}
          aria-label="Lovely Gift — trang chủ"
        >
          <span className="brand-icon">
            <Heart size={19} />
          </span>
          lovely<span>gift</span>
          <i>•</i>
        </a>
        <div className="header-actions">
          {preview && (
            <button
              onClick={() => {
                audio.pause();
                setMusic(false);
                setAdmin(true);
                setPreview(null);
              }}
            >
              Về admin
            </button>
          )}
        </div>
      </header>
      {scene === "login" && (
        <section className="welcome scene-enter">
          <div className="welcome-copy">
            <h1>
              Có một chút <em>thương,</em>
              <br />
              đang chờ <span>bạn.</span>
            </h1>
            <form className="login-form" onSubmit={login}>
              <label htmlFor="account">Nhận lời chúc gửi tới bạn 💗</label>
              <div className={`account-input ${error ? "invalid" : ""}`}>
                <Mail size={19} />
                <input
                  id="account"
                  autoComplete="username"
                  placeholder="Họ và tên + Ngày sinh"
                  value={account}
                  onChange={(e) => {
                    setAccount(e.target.value);
                    setError("");
                  }}
                  required
                />
                <button type="submit" aria-label="Tìm thiệp của tôi">
                  <ArrowRight size={21} />
                </button>
              </div>
              {error && <p className="field-error" role="alert">{error}</p>}
            </form>
          </div>
          <div className="welcome-art" aria-hidden="true">
            <div className="orbit orbit-a" />
            <div className="orbit orbit-b" />
            <Flower className="hero-flower hero-flower-a" variant={1} />
            <Flower className="hero-flower hero-flower-b" variant={2} />
            <div className="envelope-display">
              <div className="letter-peek">
                <span>Gửi bạn,</span>
                <Heart size={25} />
              </div>
              <div className="envelope-paper">
                <div className="envelope-fold" />
                <div className="seal">
                  <Heart fill="currentColor" size={21} />
                </div>
              </div>
            </div>
            <span className="art-star art-star-a">✧</span>
            <span className="art-star art-star-b">✦</span>
            <span className="floating-heart">♡</span>
          </div>
        </section>
      )}
      {scene === "envelope" && person && (
        <section className="envelope-scene scene-enter">
          <h1>
            Gửi <em>{person.name},</em>
            <br />
            một điều thật dịu dàng.
          </h1>
          <div className="open-envelope">
            <Balloons />
            <Flower className="letter-flower left" variant={3} />
            <Flower className="letter-flower right" variant={4} />
            <button
              className="envelope-button"
              onClick={() => {
                void startMusic();
                setScene("intro");
              }}
              aria-label="Mở phong thư"
            >
              <div className="envelope-paper">
                <div className="envelope-fold" />
                <span className="envelope-address">
                  Dành riêng cho {person.name}
                </span>
                <div className="seal">
                  <Heart fill="currentColor" size={22} />
                </div>
              </div>
            </button>
          </div>
        </section>
      )}
      {scene === "intro" && person && (
        <section className="intro-scene scene-enter">
          <h1>
            Hôm nay, <em>bạn là điều đặc biệt.</em>
          </h1>
          <button className="intro-letter intro-letter-button" onClick={() => {
            if (videoUrl && !(snapshot && !navigator.onLine)) { setVideoEnded(false); setScene("video"); }
            else setScene("book");
          }} aria-label={videoUrl && !(snapshot && !navigator.onLine) ? "Xem video dành cho bạn" : "Mở sổ lời chúc"}>
            <Heart size={26} />
            <p>{event.intro}</p>
            <span className="handwritten">Thương yêu bạn thật nhiều!</span>
          </button>
        </section>
      )}
      {scene === "video" && person && (
        <section className="intro-scene scene-enter">
            <YouTube
              url={videoUrl}
              onEnded={() => setVideoEnded(true)}
              onPlaying={(playing) => {
                setVideoPlaying(playing);
                if (playing) audio.pause();
                else if (music)
                  void audio.play().catch(() => setAudioError(true));
              }}
            />
          {snapshot && videoUrl && (
            <p className="subtle">
              Video YouTube cần kết nối Internet.
            </p>
          )}
          {videoEnded && <button className="primary-button" onClick={() => setScene("book")}>
            Mở sổ lời chúc <ArrowRight size={16} />
          </button>}
        </section>
      )}
      {scene === "book" && person && (
        <section className="book-scene scene-enter">
          <h1>
            Mỗi trang, <em>một chút yêu thương.</em>
          </h1>
          <div
            className={`book-stage ${turning ? "book-turning" : ""}`}
            onTouchStart={(e) => {
              touch.current = e.touches[0].clientX;
            }}
            onTouchEnd={(e) => {
              const dx = e.changedTouches[0].clientX - touch.current;
              if (dx < -45) nextPage();
              if (dx > 45) prevPage();
            }}
          >
            {page < 0 ? (
              <button className={`book-cover ${turning === "open" ? "cover-opening" : ""}`} onClick={nextPage} aria-label="Mở sổ lời chúc" disabled={!!turning}>
                <span className="cover-border" />
                <Sparkles size={25} />
                <span className="cover-label">NHỮNG ĐIỀU MUỐN NÓI</span>
                <strong>
                  Gửi
                  <br />
                  <em>{person.name}</em>
                </strong>
                <Heart size={26} />
              </button>
            ) : (
              <div onClick={() => { if (turning) return; if (page >= Math.max(pages.length - 1, 0)) setScene("garden"); else nextPage(); }}
                role="button" tabIndex={0} aria-label="Lật trang sách"
                onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); if (page >= Math.max(pages.length - 1, 0)) setScene("garden"); else nextPage(); } }}
                className={`book-spread ${turning === "forward" ? "turn-forward" : turning === "backward" ? "turn-backward" : ""}`} key={page}>
                {turning && <div className="turn-sheet" aria-hidden="true"><Heart size={24} /></div>}
                <article className="paper-page">
                  <div className="paper-top">
                    GỬI {person.name.toLocaleUpperCase("vi")}{" "}
                    <Heart size={13} />
                  </div>
                  {pages[page] ? (
                    <>
                      <p className="wish-text">{pages[page].message}</p>
                      <div className="wish-signature">
                        <span>
                          Với thương mến
                          {pages[page].continued ? " · tiếp theo" : ""},
                        </span>
                        <strong>
                          {pages[page].sender || "Một người quý mến bạn"}
                        </strong>
                      </div>
                    </>
                  ) : (
                    <p className="wish-text">
                      Một cuốn sổ đang chờ những lời thương. Chúc bạn có một
                      ngày thật đẹp.
                    </p>
                  )}
                  <span className="page-number">
                    {String(page + 1).padStart(2, "0")}
                  </span>
                </article>
                <div className="photo-page">
                  {person.photos.length ? (
                    <figure>
                      <img
                        src={person.photos[page % person.photos.length]}
                        alt={`Kỷ niệm của ${person.name}, ảnh ${(page % person.photos.length) + 1}`}
                      />
                      <figcaption>những khoảnh khắc thật đẹp ♡</figcaption>
                    </figure>
                  ) : (
                    <div className="photo-botanical">
                      <Flower variant={5} />
                      <span>Rực rỡ theo cách của bạn.</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          <div className="book-controls">
            <button
              className="circle-button"
              onClick={prevPage}
              disabled={page < 0 || !!turning}
              aria-label="Trang trước"
            >
              <ChevronLeft size={20} />
            </button>
            <span>
              {page < 0
                ? ""
                : `${page + 1} / ${Math.max(pages.length, 1)} trang`}
            </span>
            {page < pages.length - 1 || page < 0 ? (
              <button
                className="circle-button"
                onClick={nextPage}
                disabled={!!turning}
                aria-label="Trang tiếp"
              >
                <ChevronRight size={20} />
              </button>
            ) : (
              <button
                className="circle-button"
                onClick={() => setScene("garden")}
                aria-label="Mở không gian kỷ niệm"
              >
                <Sparkles size={19} />
              </button>
            )}
          </div>
        </section>
      )}
      {scene === "garden" && person && (
        <>
          <div className="garden-canvas">
            <Garden event={event} recipient={person} />
          </div>
          <div className="garden-heading scene-enter">
            <h1>
              Thế giới đẹp hơn,
              <br />
              vì có <em>{person.name}.</em>
            </h1>
          </div>
          {dock && (
            <div className="garden-dock scene-enter">
              <button onClick={() => setScene("book")}>
                <ArrowLeft size={17} />
                <span>Sổ lời chúc</span>
              </button>
              <span className="dock-separator" />
              <button
                onClick={toggleMusic}
                aria-label={music ? "Tắt nhạc" : "Bật nhạc"}
              >
                {music ? <Volume2 size={19} /> : <VolumeX size={19} />}
              </button>
              {!snapshot && (
                <button onClick={save} disabled={busy}>
                  {busy ? (
                    <LoaderCircle className="spin" size={17} />
                  ) : (
                    <Download size={17} />
                  )}
                  <span>{busy ? "Đang gói quà…" : "Giữ lại món quà"}</span>
                </button>
              )}
              <button
                onClick={() => setScene("envelope")}
                aria-label="Xem lại từ đầu"
              >
                <Mail size={18} />
              </button>
            </div>
          )}
        </>
      )}
      {audioError && (
        <button className="audio-retry" onClick={() => void startMusic()}>
          <Music2 size={15} /> Chạm để bật nhạc
        </button>
      )}
      {notice && (
        <div className="toast" role="status">
          {notice}
          <button onClick={() => setNotice("")} aria-label="Đóng thông báo">
            <X size={16} />
          </button>
        </div>
      )}
    </main>
  );
}
