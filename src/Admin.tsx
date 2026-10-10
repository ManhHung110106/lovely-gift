import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  Copy,
  Download,
  Eye,
  FileSpreadsheet,
  Heart,
  ImagePlus,
  LayoutDashboard,
  Plus,
  Save,
  Search,
  Settings2,
  Trash2,
  Upload,
  Users,
  X,
} from "lucide-react";
import Papa from "papaparse";
import type { GiftEvent, GiftStore, Recipient, Wish } from "./types";
import {
  applyWishes,
  normalize,
  parseWishes,
  uid,
  validateStore,
  wordCount,
  wishesFor,
} from "./model";
import { download, loadDraft, readFile, saveDraft, optimizePhoto } from "./storage";
import { videoId } from "./YouTube";
type Tab = "overview" | "event" | "people" | "wishes" | "import" | "publish";
const tabs = [
  ["overview", "Tổng quan", LayoutDashboard],
  ["event", "Sự kiện", CalendarDays],
  ["people", "Người nhận", Users],
  ["wishes", "Lời chúc", Heart],
  ["import", "Nhập từ Sheets", FileSpreadsheet],
  ["publish", "Lưu & xuất bản", Upload],
] as const;
export function Admin({
  published,
  onExit,
  onPreview,
  onLogout,
}: {
  published: GiftStore;
  onExit: () => void;
  onPreview: (e: GiftEvent, r: Recipient) => void;
  onLogout: () => void;
}) {
  const [store, setStore] = useState<GiftStore>(structuredClone(published));
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<Tab>("overview");
  const [selected, setSelected] = useState(published.activeEventId);
  const [status, setStatus] = useState("Đang mở bản nháp…");
  const [notice, setNotice] = useState("");
  const [filter, setFilter] = useState("");
  const [person, setPerson] = useState<Recipient | null>(null);
  const [wish, setWish] = useState<Wish | null>(null);
  const [csv, setCsv] = useState("");
  const [mode, setMode] = useState<"replace" | "update">("replace");
  const [importType, setImportType] = useState<"wishes" | "people">("wishes");
  const [mapping, setMapping] = useState({
    recipient: "",
    sender: "",
    message: "",
    id: "wish_id",
    order: "order",
  });
  const [draftVersion, setDraftVersion] = useState(0);
  const mounted = useRef(true);
  const event = store.events.find((e) => e.id === selected) || store.events[0];
  useEffect(() => {
    mounted.current = true;
    void loadDraft()
      .then((d) => {
        if (!mounted.current) return;
        if (d && !validateStore(d).length) {
          setStore(d);
          setSelected(d.activeEventId);
        }
        setReady(true);
      })
      .catch(() => {
        setReady(true);
        setNotice(
          "Không đọc được bản nháp. Bạn vẫn có thể làm việc và xuất bản sao.",
        );
      });
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    if (!ready) return;
    setStatus("Đang lưu…");
    const t = setTimeout(() => {
      void saveDraft(store)
        .then(() => {
          if (mounted.current) setStatus("Bản nháp đã lưu trên máy");
        })
        .catch(() => setStatus("Chưa lưu được — hãy xuất bản sao"));
    }, 400);
    return () => clearTimeout(t);
  }, [store, ready]);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 7000);
    return () => clearTimeout(t);
  }, [notice]);
  useEffect(() => {
    if (!person && !wish) return;
    const previous = document.activeElement as HTMLElement | null;
    const dialog = document.querySelector<HTMLElement>(".modal");
    dialog
      ?.querySelector<HTMLElement>("input:not([type=file]),textarea,select")
      ?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setPerson(null);
        setWish(null);
      }
      if (e.key === "Tab" && dialog) {
        const nodes = [
          ...dialog.querySelectorAll<HTMLElement>(
            "button,input,textarea,select",
          ),
        ].filter(
          (n) => !n.hasAttribute("disabled") && n.getClientRects().length,
        );
        const first = nodes[0],
          last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previous?.focus();
    };
  }, [person?.id, wish?.id]);
  function updateEvent(patch: Partial<GiftEvent>) {
    setStore((s) => ({
      ...s,
      events: s.events.map((e) => (e.id === event.id ? { ...e, ...patch } : e)),
    }));
    setDraftVersion((v) => v + 1);
  }
  async function leaveAdmin(recipient?: Recipient) {
    try {
      // Navigation unmounts the editor and cancels its debounce timer.
      // Finish the current write before opening the card or leaving the editor.
      await saveDraft(store);
      if (recipient) onPreview(event, recipient);
      else onExit();
    } catch {
      setStatus("Chưa lưu được — hãy xuất bản sao");
      setNotice("Chưa lưu được bản nháp. Hãy xuất bản sao trước khi rời trang.");
    }
  }
  function addEvent(copy = false) {
    const id = `event-${uid().slice(0, 8)}`;
    const e: GiftEvent = copy
      ? { ...structuredClone(event), id, title: event.title + " (bản sao)" }
      : {
          id,
          title: "Sự kiện mới",
          occasion: "Sinh nhật",
          date: new Date().toISOString().slice(0, 10),
          intro: "Gửi bạn một chút thương và những lời chúc thật chân thành.",
          videoUrl: "",
          musicUrl: "",
          theme: "rose",
          recipients: [],
          wishes: [],
        };
    setStore((s) => ({ ...s, events: [...s.events, e] }));
    setSelected(id);
    setTab("event");
    setNotice(copy ? "Đã sao chép sự kiện." : "Đã tạo sự kiện mới.");
  }
  function savePerson(e: React.FormEvent) {
    e.preventDefault();
    if (!person) return;
    if (
      event.recipients.some(
        (p) =>
          p.id !== person.id &&
          normalize(p.account) === normalize(person.account),
      )
    ) {
      setNotice("Tên truy cập đã được dùng. Chọn tên khác nhé.");
      return;
    }
    const next = event.recipients.some((p) => p.id === person.id)
      ? event.recipients.map((p) => (p.id === person.id ? person : p))
      : [...event.recipients, person];
    updateEvent({ recipients: next });
    setPerson(null);
  }
  async function addPhotos(files: FileList | null) {
    if (!files || !person) return;
    try {
      const chosen = [...files];
      if (
        chosen.some(
          (f) =>
            !["image/jpeg", "image/png", "image/webp", "image/gif"].includes(
              f.type,
            ),
        )
      )
        throw new Error("Chọn ảnh JPG, PNG, WebP hoặc GIF.");
      const images = await Promise.all(
        chosen.map(async (f) => {
          if (f.size > 15 * 1024 * 1024)
            throw new Error("Mỗi ảnh tối đa 15 MB.");
          return optimizePhoto(f);
        }),
      );
      setPerson((p) => (p ? { ...p, photos: [...p.photos, ...images] } : p));
    } catch (e) {
      setNotice((e as Error).message);
    }
  }
  function saveWish(e: React.FormEvent) {
    e.preventDefault();
    if (!wish) return;
    if (wordCount(wish.message) > 500) {
      setNotice("Lời chúc tối đa 500 từ.");
      return;
    }
    updateEvent({
      wishes: event.wishes.some((w) => w.id === wish.id)
        ? event.wishes.map((w) => (w.id === wish.id ? wish : w))
        : [...event.wishes, wish],
    });
    setWish(null);
  }
  async function readCsv(file?: File) {
    if (!file) return;
    const text = await file.text();
    setCsv(text);
    const p = Papa.parse(text, { header: true, skipEmptyLines: true });
    const h = p.meta.fields || [];
    const field = (regex: RegExp) => h.find((v) => regex.test(v)) || "";
    setMapping({
      recipient: field(/^(recipient_id|người nhận|tên người nhận)$/i),
      sender: field(/^(sender_name|người gửi|tên người gửi)$/i),
      message: field(/^(message|nội dung)$/i),
      id: field(/^wish_id$/i),
      order: field(/^order$/i),
    });
  }
  const parsed = csv ? parseWishes(csv, event.recipients, mapping) : null;
  const parsedPeople = csv
    ? Papa.parse<Record<string, string>>(csv, {
        header: true,
        skipEmptyLines: "greedy",
        transformHeader: (h) => h.replace(/^\uFEFF/, "").trim(),
      })
    : null;
  function importPeople() {
    if (!parsedPeople) return;
    const entries: Recipient[] = parsedPeople.data.map((r, i) => ({
      id: r.recipient_id?.trim() || `recipient-${i + 1}`,
      name: r.name?.trim() || r["Tên hiển thị"]?.trim() || "",
      account: r.account?.trim() || r["Tên truy cập"]?.trim() || "",
      photos: [],
    }));
    if (parsedPeople.errors.length) {
      setNotice("Tệp CSV có lỗi cấu trúc. Kiểm tra số cột.");
      return;
    }
    const merged = new Map(event.recipients.map((p) => [p.id, p]));
    entries.forEach((p) =>
      merged.set(p.id, { ...p, photos: merged.get(p.id)?.photos || [] }),
    );
    const next = {
      ...store,
      events: store.events.map((e) =>
        e.id === event.id ? { ...e, recipients: [...merged.values()] } : e,
      ),
    };
    const errors = validateStore(next);
    if (errors.length) {
      setNotice(errors.join(" "));
      return;
    }
    setStore(next);
    setNotice(`Đã nhập ${entries.length} người nhận.`);
    setCsv("");
  }
  function importWishes() {
    if (!parsed || parsed.errors.length) return;
    if (
      mode === "update" &&
      (!mapping.id || parsedPeople?.data.some((r) => !r[mapping.id]?.trim()))
    ) {
      setNotice("Chế độ cập nhật cần wish_id cho mọi dòng.");
      return;
    }
    updateEvent({ wishes: applyWishes(event.wishes, parsed.rows, mode) });
    setNotice(`Đã nhập ${parsed.rows.length} lời chúc.`);
    setCsv("");
  }
  async function portableStore() {
    const next = structuredClone(store);
    next.isDemo = false;
    for (const e of next.events) {
      for (const p of e.recipients) {
        p.photos = await Promise.all(
          p.photos.map(async (u) => {
            if (u.startsWith("data:")) return u;
            const r = await fetch(u);
            if (!r.ok) throw new Error("Không tải được ảnh để xuất.");
            return readFile(await r.blob());
          }),
        );
      }
      if (e.musicUrl && !e.musicUrl.startsWith("data:")) {
        const r = await fetch(e.musicUrl);
        if (!r.ok) throw new Error("Không tải được nhạc để xuất.");
        e.musicUrl = await readFile(await r.blob());
      }
    }
    return next;
  }
  async function exportStore() {
    const errors = validateStore(store);
    if (errors.length) {
      setNotice(errors.join(" "));
      return;
    }
    try {
      download(
        JSON.stringify(await portableStore(), null, 2),
        "lovely-gift-site.json",
      );
      setNotice("Đã xuất gói dữ liệu kèm ảnh và nhạc.");
    } catch (e) {
      setNotice((e as Error).message);
    }
  }
  async function restore(file?: File) {
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      const errors = validateStore(data);
      if (errors.length) throw new Error(errors.join(" "));
      setStore(data);
      setSelected(data.activeEventId);
      setNotice("Đã khôi phục bản nháp từ tệp.");
    } catch (e) {
      setNotice((e as Error).message);
    }
  }
  if (!ready)
    return (
      <main className="missing">
        <Save size={25} />
        <p>Đang mở bản nháp của bạn…</p>
      </main>
    );
  return (
    <main className="admin-app">
      <aside className="admin-sidebar">
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            void leaveAdmin();
          }}
        >
          <span className="brand-icon">
            <Heart size={19} />
          </span>
          lovely<span>gift</span>
          <i>•</i>
        </a>
        <span className="admin-label">GÓC NGƯỜI GÓI QUÀ</span>
        <nav>
          {tabs.map(([id, label, Icon]) => (
            <button
              key={id}
              className={tab === id ? "selected" : ""}
              onClick={() => {
                setTab(id);
                setFilter("");
              }}
            >
              <Icon size={18} />
              {label}
              {id === "people" && <small>{event.recipients.length}</small>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <p>
            <span className="status-dot" />
            {status}
          </p>
          <button onClick={() => void leaveAdmin()}>
            <ArrowLeft size={16} /> Về trang thiệp
          </button>
          <button onClick={async () => {
            try {
              await saveDraft(store);
              const response = await fetch("/api/admin/logout", { method: "POST" });
              if (!response.ok) throw new Error();
              onLogout();
            } catch { setNotice("Chưa lưu được bản nháp để đăng xuất. Hãy thử lại."); }
          }}>Đăng xuất</button>
        </div>
      </aside>
      <div className="admin-main">
        <header className="admin-topbar">
          <div>
            <span className="eyebrow">KHÔNG GIAN QUẢN TRỊ</span>
            <p>
              {event.occasion} <span> / </span> {event.title}
            </p>
          </div>
          <span className="draft-badge">
            <span /> Bản nháp trên máy
          </span>
        </header>
        <section className="admin-content">
          <div className="admin-title">
            <div>
              <span className="eyebrow">LOVELY GIFT STUDIO</span>
              <h1>{tabs.find((t) => t[0] === tab)?.[1]}</h1>
              <p>
                {tab === "overview"
                  ? "Những món quà nhỏ. Những kết nối thật đẹp."
                  : "Chuẩn bị từng chi tiết, gửi đi thật nhiều thương mến."}
              </p>
            </div>
            <select
              aria-label="Chọn sự kiện để chỉnh sửa"
              value={event.id}
              onChange={(e) => setSelected(e.target.value)}
            >
              {store.events.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.occasion} · {e.title}
                </option>
              ))}
            </select>
          </div>
          {tab === "overview" && (
            <>
              <div className="stats-grid">
                <div>
                  <span>NGƯỜI NHẬN</span>
                  <strong>
                    {event.recipients.length.toString().padStart(2, "0")}
                  </strong>
                  <Users size={24} />
                </div>
                <div>
                  <span>LỜI CHÚC ĐÃ GÓP</span>
                  <strong>
                    {event.wishes.length.toString().padStart(2, "0")}
                  </strong>
                  <Heart size={24} />
                </div>
                <div>
                  <span>KHOẢNH KHẮC</span>
                  <strong>
                    {event.recipients
                      .reduce((n, p) => n + p.photos.length, 0)
                      .toString()
                      .padStart(2, "0")}
                  </strong>
                  <ImagePlus size={24} />
                </div>
              </div>
              <div className="admin-overview-grid">
                <article className="event-highlight">
                  <div className="eyebrow">SỰ KIỆN ĐANG BIÊN SOẠN</div>
                  <h2>{event.title}</h2>
                  <p>
                    {event.occasion} ·{" "}
                    {new Date(event.date + "T12:00:00").toLocaleDateString(
                      "vi-VN",
                    )}
                  </p>
                  <button
                    className="primary-button"
                    onClick={() => setTab("event")}
                  >
                    Chăm chút sự kiện <ArrowRight size={16} />
                  </button>
                  <Heart className="highlight-heart" />
                </article>
                <article className="admin-card">
                  <h2>Một món quà, ba bước</h2>
                  <ol className="setup-steps">
                    <li>
                      <span>01</span>
                      <div>
                        <strong>Chọn người nhận</strong>
                        <p>Tên truy cập và những tấm ảnh kỷ niệm.</p>
                      </div>
                    </li>
                    <li>
                      <span>02</span>
                      <div>
                        <strong>Góp những lời thương</strong>
                        <p>Nhập từ Sheets, đọc và chỉnh sửa.</p>
                      </div>
                    </li>
                    <li>
                      <span>03</span>
                      <div>
                        <strong>Xem trước rồi gửi đi</strong>
                        <p>Xuất gói và phát hành lên GitHub Pages.</p>
                      </div>
                    </li>
                  </ol>
                </article>
              </div>
              <div className="section-heading">
                <h2>Những người nhận của bạn</h2>
                <button onClick={() => setTab("people")}>
                  Xem tất cả <ArrowRight size={15} />
                </button>
              </div>
              <div className="recipient-grid">
                {event.recipients.slice(0, 4).map((p) => (
                  <article className="recipient-card" key={p.id}>
                    <div className="avatar">
                      {p.photos[0] ? (
                        <img src={p.photos[0]} alt="" />
                      ) : (
                        p.name[0]
                      )}
                    </div>
                    <h3>{p.name}</h3>
                    <p>
                      {wishesFor(event, p.id).length} lời chúc ·{" "}
                      {p.photos.length} ảnh
                    </p>
                    <button onClick={() => void leaveAdmin(p)}>
                      <Eye size={15} /> Xem thiệp
                    </button>
                  </article>
                ))}
              </div>
            </>
          )}
          {tab === "event" && (
            <>
              <div className="admin-actions">
                <button onClick={() => addEvent()}>
                  <Plus size={16} /> Tạo sự kiện
                </button>
                <button onClick={() => addEvent(true)}>
                  <Copy size={16} /> Sao chép
                </button>
              </div>
              <div className="admin-card event-form">
                <h2>Thông tin món quà</h2>
                <div className="form-grid">
                  <label>
                    Tên sự kiện
                    <input
                      value={event.title}
                      onChange={(e) => updateEvent({ title: e.target.value })}
                    />
                  </label>
                  <label>
                    Dịp chúc mừng
                    <input
                      value={event.occasion}
                      onChange={(e) =>
                        updateEvent({ occasion: e.target.value })
                      }
                    />
                  </label>
                  <label>
                    Ngày sự kiện
                    <input
                      type="date"
                      value={event.date}
                      onChange={(e) => updateEvent({ date: e.target.value })}
                    />
                  </label>
                  <label>
                    Bảng màu
                    <select
                      value={event.theme}
                      onChange={(e) =>
                        updateEvent({
                          theme: e.target.value as GiftEvent["theme"],
                        })
                      }
                    >
                      <option value="rose">Hồng · rượu vang</option>
                      <option value="lavender">Tím · lavender</option>
                    </select>
                  </label>
                </div>
                <label>
                  Lời mở đầu
                  <textarea
                    rows={4}
                    value={event.intro}
                    onChange={(e) => updateEvent({ intro: e.target.value })}
                  />
                </label>
                <label>
                  Video YouTube
                  <input
                    placeholder="https://www.youtube.com/watch?v=…"
                    value={event.videoUrl}
                    onChange={(e) => updateEvent({ videoUrl: e.target.value })}
                  />
                  {event.videoUrl && !videoId(event.videoUrl) && (
                    <small className="field-error">
                      Đường dẫn YouTube chưa hợp lệ.
                    </small>
                  )}
                </label>
                <label>
                  Nhạc nền
                  <input
                    type="file"
                    accept="audio/*"
                    aria-label="Nhạc nền"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      try {
                        if (f) {
                          if (!f.type.startsWith("audio/") || f.size > 90 * 1024 * 1024) throw new Error("Chọn tệp nhạc hợp lệ, tối đa 90 MB.");
                          updateEvent({ musicUrl: await readFile(f) });
                        }
                      } catch (err) { setNotice((err as Error).message); }
                      e.target.value = "";
                    }}
                  />
                  <small>
                    {event.musicUrl
                      ? "Đã có nhạc nền."
                      : "Chưa chọn tệp: thiệp sẽ dùng giai điệu nhẹ tạo sẵn."}
                  </small>
                </label>
                {event.musicUrl && (
                  <>
                    <audio controls src={event.musicUrl} />
                    <button
                      className="text-button"
                      onClick={() => updateEvent({ musicUrl: "" })}
                    >
                      Gỡ nhạc
                    </button>
                  </>
                )}
                <div className="form-divider" />
                <div className="publish-event-row">
                  <div>
                    <strong>
                      {store.activeEventId === event.id
                        ? "Sự kiện hiện hành trong gói dữ liệu"
                        : "Sự kiện lưu trữ trong gói dữ liệu"}
                    </strong>
                    <p>Thay đổi sẽ áp dụng cho mọi người sau khi xuất bản.</p>
                  </div>
                  <button
                    className="primary-button"
                    disabled={store.activeEventId === event.id}
                    onClick={() =>
                      setStore((s) => ({ ...s, activeEventId: event.id }))
                    }
                  >
                    <Check size={16} /> Chọn hiện hành
                  </button>
                </div>
                {store.events.length > 1 && (
                  <button
                    className="danger-text"
                    onClick={() => {
                      if (
                        !confirm(
                          "Xóa sự kiện này khỏi bản nháp? Bản đã tải xuống không bị ảnh hưởng.",
                        )
                      )
                        return;
                      const events = store.events.filter(
                        (e) => e.id !== event.id,
                      );
                      setStore({
                        ...store,
                        events,
                        activeEventId:
                          store.activeEventId === event.id
                            ? events[0].id
                            : store.activeEventId,
                      });
                      setSelected(events[0].id);
                    }}
                  >
                    <Trash2 size={15} /> Xóa sự kiện khỏi bản nháp
                  </button>
                )}
              </div>
            </>
          )}
          {tab === "people" && (
            <>
              <div className="list-toolbar">
                <label className="search-box">
                  <Search size={17} />
                  <input
                    placeholder="Tìm tên hoặc tài khoản…"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                  />
                </label>
                <button
                  className="primary-button"
                  onClick={() =>
                    setPerson({ id: uid(), name: "", account: "", photos: [] })
                  }
                >
                  <Plus size={17} /> Thêm người nhận
                </button>
              </div>
              <div className="recipient-grid">
                {event.recipients
                  .filter((p) =>
                    normalize(p.name + " " + p.account).includes(
                      normalize(filter),
                    ),
                  )
                  .map((p) => (
                    <article className="recipient-card" key={p.id}>
                      <div className="avatar">
                        {p.photos[0] ? (
                          <img src={p.photos[0]} alt="" />
                        ) : (
                          p.name[0]
                        )}
                      </div>
                      <h3>{p.name}</h3>
                      <span className="account-tag">{p.account}</span>
                      <p>
                        {wishesFor(event, p.id).length} lời chúc ·{" "}
                        {p.photos.length} ảnh
                      </p>
                      <div>
                        <button onClick={() => setPerson(structuredClone(p))}>
                          <Settings2 size={14} /> Chỉnh sửa
                        </button>
                        <button
                          onClick={() => void leaveAdmin(p)}
                          aria-label={`Xem thiệp ${p.name}`}
                        >
                          <Eye size={16} />
                        </button>
                      </div>
                    </article>
                  ))}
              </div>
              {!event.recipients.length && (
                <div className="empty-state">
                  <Users size={30} />
                  <h2>Gửi món quà đầu tiên</h2>
                  <p>Thêm người nhận hoặc nhập danh sách từ Sheets.</p>
                </div>
              )}
            </>
          )}
          {tab === "wishes" && (
            <>
              <div className="list-toolbar">
                <select
                  aria-label="Lọc lời chúc theo người nhận"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                >
                  <option value="">Tất cả người nhận</option>
                  {event.recipients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <button
                  className="primary-button"
                  disabled={!event.recipients.length}
                  onClick={() =>
                    setWish({
                      id: uid(),
                      recipientId: event.recipients[0].id,
                      sender: "",
                      message: "",
                      order: event.wishes.length + 1,
                    })
                  }
                >
                  <Plus size={16} /> Viết lời chúc
                </button>
              </div>
              <div className="wish-list">
                {event.wishes
                  .filter((w) => !filter || w.recipientId === filter)
                  .sort((a, b) => a.order - b.order)
                  .map((w) => (
                    <article key={w.id}>
                      <div className="wish-row-meta">
                        <span>
                          Gửi{" "}
                          {
                            event.recipients.find((p) => p.id === w.recipientId)
                              ?.name
                          }
                        </span>
                        <small>
                          #{w.order} · {wordCount(w.message)} từ
                        </small>
                      </div>
                      <p>{w.message}</p>
                      <div className="wish-row-footer">
                        <span>Từ {w.sender || "Ẩn danh"}</span>
                        <div>
                          <button onClick={() => setWish({ ...w })}>
                            Chỉnh sửa
                          </button>
                          <button
                            aria-label={`Xóa lời chúc ${w.id}`}
                            onClick={() => {
                              if (confirm("Gỡ lời chúc này khỏi bản nháp?"))
                                updateEvent({
                                  wishes: event.wishes.filter(
                                    (v) => v.id !== w.id,
                                  ),
                                });
                            }}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
              </div>
              {!event.wishes.length && (
                <div className="empty-state">
                  <Heart size={30} />
                  <h2>Những trang sổ đang chờ</h2>
                  <p>Viết lời chúc hoặc nhập bảng đã duyệt từ Sheets.</p>
                </div>
              )}
            </>
          )}
          {tab === "import" && (
            <div className="admin-card import-card">
              <h2>Từ một bảng nhỏ, thành nhiều lời thương</h2>
              <p>
                Trong Google Sheets, chọn Tệp → Tải xuống → CSV. Nội dung được
                xem trước trước khi nhập.
              </p>
              <div className="segmented">
                <button
                  className={importType === "wishes" ? "active" : ""}
                  onClick={() => {
                    setImportType("wishes");
                    setCsv("");
                  }}
                >
                  Lời chúc
                </button>
                <button
                  className={importType === "people" ? "active" : ""}
                  onClick={() => {
                    setImportType("people");
                    setCsv("");
                  }}
                >
                  Người nhận
                </button>
              </div>
              <div className="upload-zone">
                <FileSpreadsheet size={32} />
                <strong>Chọn bảng CSV của bạn</strong>
                <span>Giữ tiếng Việt, emoji và các đoạn xuống dòng</span>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  aria-label="Chọn bảng CSV"
                  onChange={(e) => void readCsv(e.target.files?.[0])}
                />
              </div>
              <button
                className="text-button"
                onClick={() =>
                  download(
                    importType === "wishes"
                      ? '\uFEFFwish_id,recipient_id,sender_name,message,order\nloi-chuc-01,linh,Minh,"Chúc bạn một ngày thật đẹp 🌷",1'
                      : "\uFEFFrecipient_id,name,account\nlinh,Linh,linh",
                    "mau-" + importType + ".csv",
                    "text/csv;charset=utf-8",
                  )
                }
              >
                <Download size={15} /> Tải mẫu bảng
              </button>
              {csv && importType === "wishes" && parsed && (
                <>
                  <h3>Đối chiếu cột</h3>
                  <div className="form-grid">
                    {(
                      [
                        ["recipient", "Người nhận"],
                        ["sender", "Người gửi"],
                        ["message", "Nội dung"],
                        ["id", "Mã lời chúc"],
                        ["order", "Thứ tự"],
                      ] as const
                    ).map(([key, label]) => (
                      <label key={key}>
                        {label}
                        <select
                          value={mapping[key]}
                          onChange={(e) =>
                            setMapping({ ...mapping, [key]: e.target.value })
                          }
                        >
                          <option value="">Không chọn</option>
                          {parsed.headers.map((h) => (
                            <option key={h} value={h}>
                              {h}
                            </option>
                          ))}
                        </select>
                      </label>
                    ))}
                  </div>
                  <label>
                    Cách nhập
                    <select
                      value={mode}
                      onChange={(e) =>
                        setMode(e.target.value as "replace" | "update")
                      }
                    >
                      <option value="replace">
                        Thay toàn bộ lời chúc của sự kiện
                      </option>
                      <option value="update">
                        Cập nhật theo mã lời chúc (wish_id)
                      </option>
                    </select>
                  </label>
                  <div className="import-preview">
                    <h3>{parsed.rows.length} lời chúc được nhận diện</h3>
                    {parsed.errors.length ? (
                      <div role="alert" className="import-errors">
                        {parsed.errors.map((e, i) => (
                          <p key={i}>{e}</p>
                        ))}
                      </div>
                    ) : (
                      <p className="success-note">
                        <Check size={16} /> Đủ thông tin để nhập
                      </p>
                    )}
                    {parsed.rows.slice(0, 5).map((w) => (
                      <div key={w.id}>
                        <strong>
                          {
                            event.recipients.find((p) => p.id === w.recipientId)
                              ?.name
                          }{" "}
                          ← {w.sender || "Ẩn danh"}
                        </strong>
                        <p>{w.message}</p>
                      </div>
                    ))}
                  </div>
                  <button
                    className="primary-button"
                    disabled={!!parsed.errors.length || !parsed.rows.length}
                    onClick={importWishes}
                  >
                    Áp dụng {parsed.rows.length} lời chúc{" "}
                    <ArrowRight size={16} />
                  </button>
                </>
              )}
              {csv && importType === "people" && parsedPeople && (
                <>
                  <p>
                    {parsedPeople.data.length} dòng · Cột: recipient_id, name,
                    account. Cùng mã sẽ cập nhật tên và giữ ảnh.
                  </p>
                  <div className="import-preview">
                    {parsedPeople.data.slice(0, 5).map((r, i) => (
                      <p key={i}>
                        {r.name || r["Tên hiển thị"]} ·{" "}
                        {r.account || r["Tên truy cập"]}
                      </p>
                    ))}
                  </div>
                  <button className="primary-button" onClick={importPeople}>
                    Kiểm tra và nhập danh sách <ArrowRight size={16} />
                  </button>
                </>
              )}
            </div>
          )}
          {tab === "publish" && (
            <>
              <div className="publish-notice">
                <Save size={22} />
                <div>
                  <strong>
                    Bản nháp và bản công khai là hai phiên bản riêng
                  </strong>
                  <p>
                    Lưu trên máy giúp bạn tiếp tục soạn. Xuất gói và triển khai
                    để người nhận thấy thay đổi.
                  </p>
                </div>
              </div>
              <div className="admin-overview-grid">
                <article className="admin-card">
                  <h2>Giữ lại công sức của bạn</h2>
                  <p>
                    Gói JSON chứa tất cả sự kiện, người nhận, lời chúc, ảnh và
                    nhạc để khôi phục hoặc xuất bản.
                  </p>
                  <button
                    className="primary-button"
                    onClick={() => void exportStore()}
                  >
                    <Download size={16} /> Xuất gói dữ liệu
                  </button>
                  <label className="restore-label">
                    <Upload size={16} /> Khôi phục từ gói JSON
                    <input
                      type="file"
                      accept=".json"
                      onChange={(e) => void restore(e.target.files?.[0])}
                    />
                  </label>
                  <small>
                    {draftVersion > 0
                      ? "Có thay đổi trong phiên biên soạn này."
                      : "Kiểm tra dữ liệu trước khi xuất bản."}
                  </small>
                </article>
                <article className="admin-card">
                  <h2>Phát hành lên GitHub Pages</h2>
                  <ol className="publish-steps">
                    <li>Xuất gói dữ liệu và kiểm tra thiệp bằng Xem trước.</li>
                    <li>
                      Chạy{" "}
                      <code>npm run publish:data -- đường-dẫn-tệp.json</code>{" "}
                      trong dự án.
                    </li>
                    <li>
                      Commit và push lên nhánh main. GitHub Actions sẽ build và
                      triển khai.
                    </li>
                    <li>
                      Mở URL công khai để kiểm tra trước khi gửi tên truy cập.
                    </li>
                  </ol>
                  <p>
                    Chuyển sự kiện vẫn giữ thiệp cũ qua đường dẫn có mã sự kiện.
                    Xóa dữ liệu vĩnh viễn sẽ mất đường dẫn online tương ứng.
                  </p>
                </article>
              </div>
            </>
          )}
        </section>
      </div>
      {person && (
        <div className="modal-backdrop">
          <form
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label="Chỉnh sửa người nhận"
            onSubmit={savePerson}
          >
            <div className="modal-heading">
              <h2>Chăm chút thiệp của bạn</h2>
              <button
                type="button"
                onClick={() => setPerson(null)}
                aria-label="Đóng"
              >
                <X size={20} />
              </button>
            </div>
            <label>
              Tên hiển thị
              <input
                required
                value={person.name}
                onChange={(e) => setPerson({ ...person, name: e.target.value })}
              />
            </label>
            <label>
              Tên truy cập
              <input
                required
                value={person.account}
                onChange={(e) =>
                  setPerson({ ...person, account: e.target.value })
                }
              />
              <small>Có thể dùng Họ và tên + Ngày sinh. Tên này dùng để nhận thiệp; trên thiệp sẽ dùng Tên hiển thị ở trên.</small>
            </label>
            <label className="image-upload">
              <ImagePlus size={18} /> Thêm ảnh kỷ niệm
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                multiple
                onChange={(e) => void addPhotos(e.target.files)}
              />
            </label>
            <div className="photo-grid">
              {person.photos.map((p, i) => (
                <div key={i}>
                  <img src={p} alt={`Ảnh ${i + 1}`} />
                  <button
                    type="button"
                    onClick={() =>
                      setPerson({
                        ...person,
                        photos: person.photos.filter((_, idx) => idx !== i),
                      })
                    }
                    aria-label={`Gỡ ảnh ${i + 1}`}
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
            <div className="modal-footer">
              {event.recipients.some((p) => p.id === person.id) && (
                <button
                  type="button"
                  className="danger-text"
                  onClick={() => {
                    if (
                      confirm(
                        "Xóa người nhận và các lời chúc liên quan khỏi bản nháp?",
                      )
                    ) {
                      updateEvent({
                        recipients: event.recipients.filter(
                          (p) => p.id !== person.id,
                        ),
                        wishes: event.wishes.filter(
                          (w) => w.recipientId !== person.id,
                        ),
                      });
                      setPerson(null);
                    }
                  }}
                >
                  <Trash2 size={15} /> Xóa
                </button>
              )}
              <button className="primary-button" type="submit">
                <Check size={16} /> Lưu người nhận
              </button>
            </div>
          </form>
        </div>
      )}
      {wish && (
        <div className="modal-backdrop">
          <form
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label="Chỉnh sửa lời chúc"
            onSubmit={saveWish}
          >
            <div className="modal-heading">
              <h2>Một lời thương mới</h2>
              <button
                type="button"
                onClick={() => setWish(null)}
                aria-label="Đóng"
              >
                <X size={20} />
              </button>
            </div>
            <label>
              Gửi đến
              <select
                value={wish.recipientId}
                onChange={(e) =>
                  setWish({ ...wish, recipientId: e.target.value })
                }
              >
                {event.recipients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Người gửi
              <input
                placeholder="Để trống nếu muốn ẩn danh"
                value={wish.sender}
                onChange={(e) => setWish({ ...wish, sender: e.target.value })}
              />
            </label>
            <label>
              Nội dung
              <textarea
                required
                rows={7}
                value={wish.message}
                onChange={(e) => setWish({ ...wish, message: e.target.value })}
              />
              <small
                className={wordCount(wish.message) > 500 ? "field-error" : ""}
              >
                {wordCount(wish.message)} / 500 từ
              </small>
            </label>
            <label>
              Thứ tự trong sổ
              <input
                type="number"
                min={1}
                required
                value={wish.order}
                onChange={(e) =>
                  setWish({ ...wish, order: Number(e.target.value) })
                }
              />
            </label>
            <div className="modal-footer">
              <button
                type="submit"
                className="primary-button"
                disabled={wordCount(wish.message) > 500}
              >
                <Check size={16} /> Lưu lời chúc
              </button>
            </div>
          </form>
        </div>
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
