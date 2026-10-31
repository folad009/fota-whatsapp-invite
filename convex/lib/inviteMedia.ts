export const CAROUSEL_MIN_SLIDES = 2;
export const CAROUSEL_MAX_SLIDES = 10;
export const WHATSAPP_VIDEO_MAX_BYTES = 100 * 1024 * 1024;
export const WHATSAPP_NATIVE_VIDEO_MAX_BYTES = 16 * 1024 * 1024;
export const WHATSAPP_VIDEO_MAX_SECONDS = 4 * 60;

export type MediaType = "image" | "carousel" | "video";

export type CarouselSlide = {
  cloudinaryPublicId: string;
  imageUrl: string;
};

export type EventMediaInput = {
  mediaType?: MediaType;
  imageUrl?: string;
  cloudinaryPublicId?: string;
  carouselSlides?: CarouselSlide[];
  videoUrl?: string;
  videoPublicId?: string;
  videoSizeBytes?: number;
};

export type StoredMedia = {
  mediaType: MediaType;
  imageUrl?: string;
  cloudinaryPublicId?: string;
  carouselSlides?: CarouselSlide[];
  videoUrl?: string;
  videoPublicId?: string;
  videoSizeBytes?: number;
};

export type InviteText = {
  inviteeName: string;
  title: string;
  eventDate: string;
  location: string;
  registerPath: string;
  description: string;
};

export type InviteMediaPlan =
  | { channel: "image"; mediaVariable: string }
  | { channel: "carousel"; mediaVariables: string[] }
  | { channel: "video"; mediaVariable: string }
  | { channel: "videoLink"; videoUrl: string }
  | { channel: "none" }
  | { channel: "error"; message: string };

const WHATSAPP_DATE_FORMAT: Intl.DateTimeFormatOptions = {
  weekday: "short",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "Africa/Lagos",
};

function clean(value?: string): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function formatWhatsAppEventDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString("en-US", WHATSAPP_DATE_FORMAT);
}

export function formatWhatsAppEventDateRange(
  start: number,
  end?: number
): string {
  if (end === undefined) {
    return formatWhatsAppEventDate(start);
  }
  return `${formatWhatsAppEventDate(start)} – ${formatWhatsAppEventDate(end)}`;
}

export function assertEventSchedule(args: {
  date: number;
  endDate?: number | null;
  now: number;
  requireFutureStart: boolean;
}): void {
  if (args.requireFutureStart && args.date <= args.now) {
    throw new Error("Event date must be in the future");
  }
  if (args.endDate != null && args.endDate <= args.date) {
    throw new Error("Event end must be after the start");
  }
}

export function resolveStoredMedia(input: EventMediaInput): StoredMedia {
  const mediaType = input.mediaType ?? inferMediaType(input);

  if (mediaType === "carousel") {
    const slides = (input.carouselSlides ?? []).map((slide) => ({
      cloudinaryPublicId: slide.cloudinaryPublicId.trim(),
      imageUrl: slide.imageUrl.trim(),
    }));
    if (
      slides.length < CAROUSEL_MIN_SLIDES ||
      slides.length > CAROUSEL_MAX_SLIDES
    ) {
      throw new Error(
        `Carousel invites need between ${CAROUSEL_MIN_SLIDES} and ${CAROUSEL_MAX_SLIDES} images`
      );
    }
    if (slides.some((slide) => !slide.cloudinaryPublicId || !slide.imageUrl)) {
      throw new Error("Each carousel image needs a Cloudinary file");
    }
    return { mediaType, carouselSlides: slides };
  }

  if (mediaType === "video") {
    const videoUrl = clean(input.videoUrl);
    const videoPublicId = clean(input.videoPublicId);
    if (!videoUrl || !videoPublicId) {
      throw new Error("A video invite needs a video file");
    }
    return {
      mediaType,
      videoUrl,
      videoPublicId,
      ...(input.videoSizeBytes !== undefined ? { videoSizeBytes: input.videoSizeBytes } : {}),
    };
  }

  const imageUrl = clean(input.imageUrl);
  const cloudinaryPublicId = clean(input.cloudinaryPublicId);
  return {
    mediaType: "image",
    ...(imageUrl ? { imageUrl } : {}),
    ...(cloudinaryPublicId ? { cloudinaryPublicId } : {}),
  };
}

export function validateWhatsAppVideoFile(
  file: { name: string; type: string; size: number },
  durationSeconds: number
): string | null {
  const isMp4 =
    file.type === "video/mp4" || file.name.toLowerCase().endsWith(".mp4");
  if (!isMp4) {
    return "WhatsApp video invites must be MP4 files.";
  }
  if (file.size > WHATSAPP_VIDEO_MAX_BYTES) {
    return "Video uploads must be 100 MB or smaller.";
  }
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    return "Could not read the video duration.";
  }
  if (durationSeconds > WHATSAPP_VIDEO_MAX_SECONDS) {
    return `WhatsApp video invites must be ${WHATSAPP_VIDEO_MAX_SECONDS} seconds or shorter.`;
  }
  return null;
}

export function planInviteMedia(
  event: EventMediaInput,
  env: {
    carouselTemplateSid?: string;
    carouselCardCount?: number;
    videoTemplateSid?: string;
    videoLinkTemplateSid?: string;
  }
): InviteMediaPlan {
  const mediaType = event.mediaType ?? inferMediaType(event);

  if (mediaType === "video" || event.mediaType === "video") {
    const videoUrl = clean(event.videoUrl);
    const videoSizeBytes = event.videoSizeBytes;
    if (videoSizeBytes !== undefined && videoSizeBytes > WHATSAPP_NATIVE_VIDEO_MAX_BYTES) {
      if (!clean(env.videoLinkTemplateSid)) {
        return { channel: "error", message: "Videos larger than 16 MB require an approved link template. Set TWILIO_CONTENT_EVENT_INVITE_VIDEO_LINK." };
      }
      if (!videoUrl) return { channel: "error", message: "Missing shareable video URL" };
      return { channel: "videoLink", videoUrl };
    }
    if (!clean(env.videoTemplateSid)) {
      return {
        channel: "error",
        message: "WhatsApp video invites up to 16 MB require TWILIO_CONTENT_EVENT_INVITE_VIDEO.",
      };
    }
    if (!clean(env.videoLinkTemplateSid)) {
      return {
        channel: "error",
        message: "Video invitations also require an approved share-link template. Set TWILIO_CONTENT_EVENT_INVITE_VIDEO_LINK.",
      };
    }
    const videoPublicId = clean(event.videoPublicId);
    if (!videoPublicId) {
      return {
        channel: "error",
        message: "Missing Cloudinary public id for the video invite",
      };
    }
    return {
      channel: "video",
      mediaVariable: getWhatsAppVideoMediaVariable(videoPublicId),
    };
  }

  if (mediaType === "carousel") {
    const slides = event.carouselSlides ?? [];
    const carouselSid = clean(env.carouselTemplateSid);
    if (!carouselSid) {
      const first = slides[0];
      if (!first) return { channel: "none" };
      return imagePlan(first.cloudinaryPublicId, first.imageUrl);
    }
    if (
      env.carouselCardCount === undefined ||
      !Number.isInteger(env.carouselCardCount)
    ) {
      return {
        channel: "error",
        message:
          "Set TWILIO_CAROUSEL_CARD_COUNT to the number of cards in the approved carousel template.",
      };
    }
    if (slides.length !== env.carouselCardCount) {
      return {
        channel: "error",
        message: `This carousel has ${slides.length} images, but the approved WhatsApp template expects ${env.carouselCardCount} cards.`,
      };
    }
    return {
      channel: "carousel",
      mediaVariables: slides.map((slide) =>
        getWhatsAppImageMediaVariable(slide.cloudinaryPublicId, slide.imageUrl)
      ),
    };
  }

  return imagePlan(event.cloudinaryPublicId, event.imageUrl);
}

export function buildInviteContentVariables(
  plan: Extract<InviteMediaPlan, { channel: "image" | "carousel" | "video" }>,
  text: InviteText
): Record<string, string> {
  const textValues = [
    text.inviteeName,
    text.title,
    text.eventDate,
    text.location,
    text.registerPath,
    text.description,
  ];

  if (plan.channel === "carousel") {
    const variables: Record<string, string> = {};
    plan.mediaVariables.forEach((mediaVariable, index) => {
      variables[String(index + 1)] = mediaVariable;
    });
    textValues.forEach((value, index) => {
      variables[String(plan.mediaVariables.length + index + 1)] = value;
    });
    return variables;
  }

  return {
    "1": plan.mediaVariable,
    "2": text.inviteeName,
    "3": text.title,
    "4": text.eventDate,
    "5": text.location,
    "6": text.registerPath,
    "7": text.description,
  };
}

function inferMediaType(input: EventMediaInput): MediaType {
  if (input.mediaType) return input.mediaType;
  if ((input.carouselSlides?.length ?? 0) > 0) return "carousel";
  if (clean(input.videoUrl) || clean(input.videoPublicId)) return "video";
  return "image";
}

function imagePlan(
  cloudinaryPublicId?: string,
  imageUrl?: string
): InviteMediaPlan {
  if (!clean(cloudinaryPublicId) && !clean(imageUrl)) {
    return { channel: "none" };
  }
  try {
    return {
      channel: "image",
      mediaVariable: getWhatsAppImageMediaVariable(
        cloudinaryPublicId ?? "",
        imageUrl
      ),
    };
  } catch {
    return { channel: "none" };
  }
}

function stripCloudinaryDeliveryPath(uploadPath: string): string {
  let path = uploadPath;
  while (/^v\d+\//.test(path) || /^c_[^/]+\//.test(path)) {
    path = path.replace(/^v\d+\//, "").replace(/^c_[^/]+\//, "");
  }
  return path.replace(/\.(jpe?g|png|webp)$/i, "");
}

function getWhatsAppImageMediaVariable(
  cloudinaryPublicId: string,
  imageUrl?: string
): string {
  if (cloudinaryPublicId.trim()) {
    return cloudinaryPublicId.replace(/\.(jpe?g|png|webp)$/i, "");
  }

  if (imageUrl) {
    const match = imageUrl.match(/\/upload\/(.+?)(?:\?|$)/);
    if (match?.[1]) {
      return stripCloudinaryDeliveryPath(match[1]);
    }
  }

  throw new Error("Missing Cloudinary public_id for WhatsApp media variable");
}

function getWhatsAppVideoMediaVariable(cloudinaryPublicId: string): string {
  const publicId = cloudinaryPublicId
    .trim()
    .replace(/\.(mp4|3gp|3gpp)$/i, "");
  if (!publicId) {
    throw new Error("Missing Cloudinary public_id for WhatsApp video");
  }
  return publicId;
}
