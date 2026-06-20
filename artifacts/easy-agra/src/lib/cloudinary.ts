const CLOUD_NAME = "dwd9hk7ir";
const UPLOAD_PRESET = "ml_default";

export async function uploadToCloudinary(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message ?? "Image upload failed");
  }

  const data = await res.json();
  return data.secure_url as string;
}

export async function uploadMultipleToCloudinary(files: File[]): Promise<string[]> {
  return Promise.all(files.map(uploadToCloudinary));
}
