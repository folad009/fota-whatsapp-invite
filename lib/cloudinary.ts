import { v2 as cloudinary } from "cloudinary";

/** WhatsApp header media ~1.91:1 (1200×630) — fit inside frame with letterboxing. */
export const WHATSAPP_BANNER_WIDTH = 1200;
export const WHATSAPP_BANNER_HEIGHT = 630;
export const WHATSAPP_BANNER_ASPECT_RATIO =
  WHATSAPP_BANNER_WIDTH / WHATSAPP_BANNER_HEIGHT;
export const WHATSAPP_BANNER_TRANSFORMATION = `c_fit,w_${WHATSAPP_BANNER_WIDTH},h_${WHATSAPP_BANNER_HEIGHT},b_white`;

export function getCloudinary() {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  return cloudinary;
}

export function getSignedUploadParams(folder = "event-banners") {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error("Cloudinary credentials not configured");
  }

  const timestamp = Math.round(Date.now() / 1000);
  const cld = getCloudinary();

  const signature = cld.utils.api_sign_request(
    {
      timestamp,
      folder,
      transformation: WHATSAPP_BANNER_TRANSFORMATION,
    },
    apiSecret
  );

  return {
    timestamp,
    signature,
    cloudName,
    apiKey,
    folder,
  };
}
