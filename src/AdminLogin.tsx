import { useEffect, useState } from "react";
import { Heart, ArrowRight } from "lucide-react";

export function AdminLogin({ onAuthenticated }: { onAuthenticated: () => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    void fetch("/api/admin/session").then(r => r.ok ? r.json() : null).then(s => {
      if (s?.authenticated) onAuthenticated();
    }).catch(() => {});
  }, [onAuthenticated]);
  return <main className="admin-login gift-app"><form onSubmit={async e => {
    e.preventDefault(); setBusy(true); setError("");
    try {
      const response = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, password }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setPassword(""); onAuthenticated();
    } catch (err) { setError((err as Error).message); }
    finally { setBusy(false); }
  }}>
    <Heart size={28} /><h1>Góc người <em>gói quà.</em></h1>
    <label>Tài khoản<input autoComplete="username" value={username} onChange={e => setUsername(e.target.value)} required /></label>
    <label>Mật khẩu<input type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} required /></label>
    {error && <p role="alert">{error}</p>}
    <button className="primary-button" disabled={busy}>{busy ? "Đang đăng nhập…" : "Đăng nhập"}<ArrowRight size={18}/></button>
  </form></main>;
}
