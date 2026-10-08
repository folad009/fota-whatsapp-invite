import { v2 as cloudinary } from "cloudinary";
import { WHATSAPP_BANNER_TRANSFORMATION } from "./cloudinaryConstants";

export {
  WHATSAPP_BANNER_ASPECT_RATIO,
  WHATSAPP_BANNER_HEIGHT,
  WHATSAPP_BANNER_TRANSFORMATION,
  WHATSAPP_BANNER_WIDTH,
} from "./cloudinaryConstants";

export function getCloudinary() {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  return cloudinary;
}

type SignedUploadOptions = {
  folder?: string;
  transformation?: string | null;
  resourceType?: "image" | "video";
};

export function getSignedUploadParams(
  folderOrOptions: string | SignedUploadOptions = "event-banners"
) {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error("Cloudinary credentials not configured");
  }

  const options: SignedUploadOptions =
    typeof folderOrOptions === "string"
      ? { folder: folderOrOptions }
      : folderOrOptions;
  const folder = options.folder ?? "event-banners";
  const resourceType = options.resourceType ?? "image";
  const transformation =
    options.transformation === undefined
      ? WHATSAPP_BANNER_TRANSFORMATION
      : options.transformation;

  const timestamp = Math.round(Date.now() / 1000);
  const cld = getCloudinary();
  const paramsToSign: Record<string, string | number> = { timestamp, folder };
  if (transformation) {
    paramsToSign.transformation = transformation;
  }

  const signature = cld.utils.api_sign_request(paramsToSign, apiSecret);

  return {
    timestamp,
    signature,
    cloudName,
    apiKey,
    folder,
    resourceType,
    ...(transformation ? { transformation } : {}),
  };
}
