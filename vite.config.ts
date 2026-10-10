import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { localAdmin } from "./server/admin.ts";
export default defineConfig({
  plugins: [react(), ...(process.env.NODE_ENV === "production" ? [] : [localAdmin()])],
  base: process.env.PAGES_BASE || "/",
  build: { chunkSizeWarningLimit: 1700 },
  server: { host: "127.0.0.1", fs: { deny: [".env", ".env.*", "*.{crt,pem}", "**/.local-admin/**", "**/.git/**"] } },
});
