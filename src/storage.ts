import { get, set } from "idb-keyval";
import type { GiftStore } from "./types";
export const loadDraft = async () => {
  const response = await fetch("/api/admin/draft");
  if (!response.ok) throw new Error("Vui lòng đăng nhập admin.");
  const draft = await response.json();
  return draft || get<GiftStore>("lovely-gift-draft-v1");
};
export const saveDraft = async (store: GiftStore) => {
  const response = await fetch("/api/admin/draft", {
    method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(store),
  });
  if (!response.ok) throw new Error("Không lưu được bản nháp. Kiểm tra phiên đăng nhập.");
  await set("lovely-gift-draft-v1", store);
};
export const readFile = (file: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Không đọc được tệp."));
    reader.readAsDataURL(file);
  });
export async function optimizePhoto(file: File): Promise<string> {
  const image = await createImageBitmap(file);
  const scale = Math.min(1, 1800 / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));
  canvas.getContext("2d")!.drawImage(image, 0, 0, canvas.width, canvas.height);
  image.close();
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Không xử lý được ảnh này."))),
      "image/webp",
      0.88,
    ),
  );
  return readFile(blob);
}
export function download(
  content: BlobPart,
  name: string,
  type = "application/json",
) {
  const blob = content instanceof Blob ? content : new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export function downloadUrl(url: string, name: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

