import { Router } from "express";
import { v2 as cloudinary } from "cloudinary";
import { requireAuth } from "../middlewares/requireAuth";

const router = Router();

cloudinary.config({
  cloud_name: "dwd9hk7ir",
  api_key: process.env.CLOUDINARY_API_KEY ?? "",
  api_secret: process.env.CLOUDINARY_API_SECRET ?? "",
});

// POST /api/upload — signed upload via backend, accepts base64 or multipart
// Frontend sends: { data: "base64string", folder?: string }
router.post("/upload", requireAuth, async (req, res): Promise<void> => {
  const { data, folder = "easy-agra" } = req.body;

  if (!data) {
    res.status(400).json({ error: "No image data provided" });
    return;
  }

  if (!process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    res.status(500).json({ error: "Cloudinary not configured" });
    return;
  }

  const result = await cloudinary.uploader.upload(data, {
    folder,
    resource_type: "image",
    quality: "auto:best",
    fetch_format: "auto",
  });

  res.json({ url: result.secure_url });
});

export default router;
