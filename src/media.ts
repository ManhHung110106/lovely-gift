export function videoId(url: string) {
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
