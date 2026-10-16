import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { existsSync, readFileSync, writeFileSync, mkdirSync, renameSync, unlinkSync, createWriteStream } from "node:fs";
import { resolve } from "node:path";
import type { Plugin } from "vite";
import { validateStore } from "../src/model.ts";

export function localAdmin(): Plugin {
  const root = resolve(".local-admin");
  mkdirSync(root, { recursive: true });
  const credentials = resolve(root, "credentials.json");
  if (!existsSync(credentials)) {
    const password = randomBytes(18).toString("base64url");
    const salt = randomBytes(16).toString("hex");
    writeFileSync(credentials, JSON.stringify({ username: "admin", salt, hash: scryptSync(password, salt, 64).toString("hex") }));
    writeFileSync(resolve(root, "login.txt"), `Tài khoản: admin\nMật khẩu: ${password}\nURL: http://127.0.0.1:5173/admin\nChỉ lưu trên máy bạn. Không commit thư mục này.\n`);
  }
  const sessions = new Map<string, number>();
  let failures = 0, retryAt = 0;
  return {
    name: "lovely-gift-local-admin",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (decodeURIComponent(req.url || "").includes(".local-admin")) {
          res.statusCode = 403; res.end("Forbidden"); return;
        }
        if (!req.url?.startsWith("/api/admin/")) return next();
        const reply = (status: number, body: unknown) => {
          res.statusCode = status;
          res.setHeader("Content-Type", "application/json");
          res.setHeader("Cache-Control", "no-store");
          res.end(JSON.stringify(body));
        };
        const host = req.headers.host || "";
        if (!/^(127\.0\.0\.1|localhost)(:\d+)?$/.test(host)) return reply(403, { error: "Chỉ dùng admin trên máy local." });
        if (req.headers.origin && req.headers.origin !== `http://${host}`) return reply(403, { error: "Nguồn yêu cầu không hợp lệ." });
        const token = req.headers.cookie?.match(/(?:^|;\s*)gift_admin=([^;]+)/)?.[1];
        const authenticated = !!token && (sessions.get(token) || 0) > Date.now();
        const endpoint = req.url.split("?")[0];
        if (endpoint === "/api/admin/session" && req.method === "GET") return reply(200, { authenticated });
        if (endpoint === "/api/admin/logout" && req.method === "POST") {
          if (token) sessions.delete(token);
          res.setHeader("Set-Cookie", "gift_admin=; HttpOnly; SameSite=Strict; Path=/api/admin; Max-Age=0");
          return reply(200, { ok: true });
        }
        if (endpoint !== "/api/admin/login" && !authenticated) return reply(401, { error: "Vui lòng đăng nhập admin." });
        if (endpoint === "/api/admin/media" && req.method === "POST") {
          try {
            const mediaDir = resolve("public/media");
            mkdirSync(mediaDir, { recursive: true });
            const urlObj = new URL(req.url || "", "http://localhost");
            const clientName = urlObj.searchParams.get("name") || "video.mp4";
            const extMatch = /\.(mp4|webm|ogg|mov|m4v|mkv|mp3|wav|png|jpg|jpeg|webp)$/i.exec(clientName);
            const ext = extMatch ? extMatch[1].toLowerCase() : "mp4";
            const tempName = `upload-${randomBytes(12).toString("hex")}.tmp`;
            const tempPath = resolve(mediaDir, tempName);
            const writeStream = createWriteStream(tempPath);
            const hasher = createHash("sha256");
            let totalBytes = 0;
            const maxBytes = 1024 * 1024 * 1024; // 1 GB
            let exceeded = false;

            for await (const chunk of req) {
              totalBytes += chunk.length;
              if (totalBytes > maxBytes) {
                exceeded = true;
                break;
              }
              hasher.update(chunk);
              writeStream.write(chunk);
            }
            writeStream.end();

            if (exceeded) {
              try { unlinkSync(tempPath); } catch {}
              return reply(413, { error: "Tệp video vượt quá 1 GB." });
            }

            const hash = hasher.digest("hex").slice(0, 24);
            const finalName = `${hash}.${ext}`;
            const finalPath = resolve(mediaDir, finalName);
            if (existsSync(finalPath)) {
              try { unlinkSync(tempPath); } catch {}
            } else {
              renameSync(tempPath, finalPath);
            }

            return reply(200, { url: `/media/${finalName}` });
          } catch (err) {
            return reply(500, { error: "Không lưu được tệp video: " + (err as Error).message });
          }
        }
        try {
          let body = "";
          if (req.method !== "GET") {
            for await (const chunk of req) {
              body += chunk.toString();
              if (body.length > 2048 * 1024 * 1024) return reply(413, { error: "Gói dữ liệu quá lớn." });
            }
          }
          if (endpoint === "/api/admin/login" && req.method === "POST") {
            if (retryAt > Date.now()) return reply(429, { error: "Thử lại sau một phút." });
            const { username, password } = JSON.parse(body);
            const stored = JSON.parse(readFileSync(credentials, "utf8"));
            const valid = typeof password === "string" && password.length <= 256 && typeof username === "string" &&
              timingSafeEqual(scryptSync(password, stored.salt, 64), Buffer.from(stored.hash, "hex")) && username === stored.username;
            if (!valid) {
              if (++failures >= 5) { retryAt = Date.now() + 60000; failures = 0; }
              return reply(401, { error: "Tài khoản hoặc mật khẩu không đúng." });
            }
            failures = 0;
            const session = randomBytes(32).toString("hex");
            sessions.set(session, Date.now() + 6 * 60 * 60 * 1000);
            res.setHeader("Set-Cookie", `gift_admin=${session}; HttpOnly; SameSite=Strict; Path=/api/admin; Max-Age=21600`);
            return reply(200, { ok: true });
          }
          if (endpoint === "/api/admin/draft") {
            const draft = resolve(root, "draft.json");
            if (req.method === "GET") return reply(200, existsSync(draft) ? JSON.parse(readFileSync(draft, "utf8")) : null);
            if (req.method === "PUT") {
              const data = JSON.parse(body);
              const errors = validateStore(data);
              if (errors.length) return reply(400, { error: errors.join(" ") });
              writeFileSync(draft + ".tmp", JSON.stringify(data));
              renameSync(draft + ".tmp", draft);
              return reply(200, { ok: true });
            }
            if (req.method === "DELETE") { if (existsSync(draft)) unlinkSync(draft); return reply(200, { ok: true }); }
          }
          return reply(404, { error: "Không tìm thấy thao tác." });
        } catch { return reply(400, { error: "Không xử lý được dữ liệu." }); }
      });
    },
  };
}
