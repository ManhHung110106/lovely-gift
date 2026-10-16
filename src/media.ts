export function videoId(url: string) {
  if (!url || typeof url !== "string" || url.startsWith("data:") || url.startsWith("blob:") || url.length > 500) {
    return "";
  }
  let id = "";
  try {
    const u = new URL(url);
    if (u.hostname === "youtu.be") id = u.pathname.slice(1).split("/")[0];
    else if (/(^|\.)youtube\.com$/.test(u.hostname))
      id =
        u.searchParams.get("v") ||
        u.pathname.split("/").filter(Boolean).pop() ||
        "";
  } catch {
    id = url;
  }
  return /^[\w-]{11}$/.test(id) ? id : "";
}

export function isVideoFile(url: string): boolean {
  if (!url || typeof url !== "string") return false;
  if (url.startsWith("data:video/")) return true;
  if (url.startsWith("blob:")) return true;
  if (url.length > 1000) return false;
  const trimmed = url.trim();
  if (/^(\.?\.?\/|\/)?media\/[^\s]+\.(mp4|webm|ogg|mov|m4v|mkv)$/i.test(trimmed)) return true;
  try {
    const u = new URL(trimmed, "http://localhost");
    return /\.(mp4|webm|ogg|mov|m4v|mkv)$/i.test(u.pathname);
  } catch {
    return false;
  }
}

export function isValidVideoUrl(url: string): boolean {
  if (!url || typeof url !== "string") return false;
  const trimmed = url.trim();
  if (!trimmed) return true;
  return Boolean(videoId(trimmed)) || isVideoFile(trimmed);
}
