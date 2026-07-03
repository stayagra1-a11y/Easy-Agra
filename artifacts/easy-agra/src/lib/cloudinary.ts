const CLOUD_NAME = "dwd9hk7ir";
const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export function imgUrl(url: string | null | undefined, width: number): string {
  if (!url) return "";
  if (!url.includes("res.cloudinary.com")) return url;
  return url.replace("/upload/", `/upload/q_auto:best,f_auto,w_${width},c_fill,dpr_auto/`);
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function uploadToCloudinary(file: File): Promise<string> {
  const base64 = await fileToBase64(file);

  const res = await fetch(`${BASE}/api/upload`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ data: base64, folder: "easy-agra" }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? "Image upload failed");
  }

  const data = await res.json();
  return data.url as string;
}

export async function uploadMultipleToCloudinary(files: File[]): Promise<string[]> {
  return Promise.all(files.map(uploadToCloudinary));
}
