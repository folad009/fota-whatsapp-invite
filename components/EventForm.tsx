"use client";

import { useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Image from "next/image";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  CAROUSEL_MAX_SLIDES,
  CAROUSEL_MIN_SLIDES,
  WHATSAPP_VIDEO_MAX_SECONDS,
  assertEventSchedule,
  resolveStoredMedia,
  validateWhatsAppVideoFile,
  type CarouselSlide,
  type MediaType,
} from "@/convex/lib/inviteMedia";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  WHATSAPP_BANNER_ASPECT_RATIO,
} from "@/lib/cloudinaryConstants";

const ASPECT_RATIO_TOLERANCE = 0.15;

type UploadKind = "image" | "carousel" | "video";

function toDatetimeLocalValue(timestamp: number): string {
  const date = new Date(timestamp);
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function readImageDimensions(
  file: File
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Could not read image dimensions"));
    };
    img.src = objectUrl;
  });
}

function readVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(video.duration);
    };
    video.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Could not read video duration"));
    };
    video.src = objectUrl;
  });
}

function getAspectRatioWarning(width: number, height: number): string | null {
  if (height === 0) {
    return null;
  }

  const ratio = width / height;
  const diff =
    Math.abs(ratio - WHATSAPP_BANNER_ASPECT_RATIO) / WHATSAPP_BANNER_ASPECT_RATIO;

  if (diff <= ASPECT_RATIO_TOLERANCE) {
    return null;
  }

  const orientation =
    ratio < WHATSAPP_BANNER_ASPECT_RATIO ? "taller than" : "wider than";
  return `This image is ${width}×${height}px (${orientation} the recommended 1200×630 landscape ratio). It will be letterboxed in WhatsApp; tall posters may still look cropped in the chat header.`;
}

async function uploadToCloudinary(file: File, kind: UploadKind) {
  const signRes = await fetch(`/api/cloudinary/sign?kind=${kind}`);
  const signData = (await signRes.json()) as {
    error?: string;
    apiKey?: string;
    timestamp?: number;
    signature?: string;
    folder?: string;
    transformation?: string;
    cloudName?: string;
    resourceType?: string;
  };
  if (!signRes.ok || !signData.apiKey || !signData.cloudName) {
    throw new Error(signData.error ?? "Could not sign upload");
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("api_key", signData.apiKey);
  formData.append("timestamp", String(signData.timestamp));
  formData.append("signature", signData.signature ?? "");
  formData.append("folder", signData.folder ?? "");
  if (signData.transformation) {
    formData.append("transformation", signData.transformation);
  }

  const uploadRes = await fetch(
    `https://api.cloudinary.com/v1_1/${signData.cloudName}/${signData.resourceType ?? "image"}/upload`,
    { method: "POST", body: formData }
  );
  const uploadData = (await uploadRes.json()) as {
    secure_url?: string;
    public_id?: string;
    error?: { message?: string };
  };
  if (!uploadRes.ok || !uploadData.secure_url || !uploadData.public_id) {
    throw new Error(uploadData.error?.message ?? "Upload failed");
  }
  return { url: uploadData.secure_url, publicId: uploadData.public_id };
}

interface EventFormProps {
  eventId?: Id<"events">;
  initial?: {
    title: string;
    description?: string;
    date: number;
    endDate?: number;
    location: string;
    mediaType?: MediaType;
    imageUrl?: string;
    cloudinaryPublicId?: string;
    carouselSlides?: CarouselSlide[];
    videoUrl?: string;
    videoPublicId?: string;
    capacity?: number;
    customFields?: string[];
    publicRegistrationEnabled?: boolean;
  };
}

function initialMediaType(initial: EventFormProps["initial"]): MediaType {
  if (initial?.mediaType) return initial.mediaType;
  if (initial?.videoUrl) return "video";
  if ((initial?.carouselSlides?.length ?? 0) > 0) return "carousel";
  return "image";
}

export function EventForm({ eventId, initial }: EventFormProps) {
  const router = useRouter();
  const createEvent = useMutation(api.events.create);
  const updateEvent = useMutation(api.events.update);

  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [date, setDate] = useState(
    initial?.date ? toDatetimeLocalValue(initial.date) : ""
  );
  const [endDate, setEndDate] = useState(
    initial?.endDate ? toDatetimeLocalValue(initial.endDate) : ""
  );
  const [location, setLocation] = useState(initial?.location ?? "");
  const [capacity, setCapacity] = useState(initial?.capacity?.toString() ?? "");
  const [customFieldsText, setCustomFieldsText] = useState(
    initial?.customFields?.join(", ") ?? ""
  );
  const [publicRegistrationEnabled, setPublicRegistrationEnabled] = useState(
    initial?.publicRegistrationEnabled ?? false
  );
  const [mediaType, setMediaType] = useState<MediaType>(initialMediaType(initial));
  const [imageUrl, setImageUrl] = useState(initial?.imageUrl ?? "");
  const [cloudinaryPublicId, setCloudinaryPublicId] = useState(
    initial?.cloudinaryPublicId ?? ""
  );
  const [slides, setSlides] = useState<CarouselSlide[]>(
    initial?.carouselSlides ?? []
  );
  const [videoUrl, setVideoUrl] = useState(initial?.videoUrl ?? "");
  const [videoPublicId, setVideoPublicId] = useState(initial?.videoPublicId ?? "");
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [bannerAspectWarning, setBannerAspectWarning] = useState<string | null>(
    null
  );

  const selectMediaType = (next: MediaType) => {
    setMediaType(next);
    setError("");
    if (next !== "image") {
      setImageUrl("");
      setCloudinaryPublicId("");
      setBannerAspectWarning(null);
    }
    if (next !== "carousel") setSlides([]);
    if (next !== "video") {
      setVideoUrl("");
      setVideoPublicId("");
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError("");
    setBannerAspectWarning(null);

    try {
      const dimensions = await readImageDimensions(file);
      setBannerAspectWarning(
        getAspectRatioWarning(dimensions.width, dimensions.height)
      );
      const uploaded = await uploadToCloudinary(file, "image");
      setImageUrl(uploaded.url);
      setCloudinaryPublicId(uploaded.publicId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Image upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleCarouselUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;

    if (slides.length + files.length > CAROUSEL_MAX_SLIDES) {
      setError(`Carousel invites can include up to ${CAROUSEL_MAX_SLIDES} images.`);
      return;
    }

    setUploading(true);
    setError("");
    try {
      const uploaded: CarouselSlide[] = [];
      for (const file of files) {
        const result = await uploadToCloudinary(file, "carousel");
        uploaded.push({
          cloudinaryPublicId: result.publicId,
          imageUrl: result.url,
        });
      }
      setSlides((current) => [...current, ...uploaded]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Carousel upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setUploading(true);
    setError("");
    try {
      const duration = await readVideoDuration(file);
      const validationError = validateWhatsAppVideoFile(file, duration);
      if (validationError) {
        setError(validationError);
        return;
      }
      const uploaded = await uploadToCloudinary(file, "video");
      setVideoUrl(uploaded.url);
      setVideoPublicId(uploaded.publicId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Video upload failed");
    } finally {
      setUploading(false);
    }
  };

  const moveSlide = (index: number, direction: -1 | 1) => {
    setSlides((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      const [item] = next.splice(index, 1);
      if (!item) return current;
      next.splice(target, 0, item);
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const customFields = customFieldsText
        .split(",")
        .map((field) => field.trim())
        .filter(Boolean);
      const startTime = new Date(date).getTime();
      const endTime = endDate ? new Date(endDate).getTime() : null;
      assertEventSchedule({
        date: startTime,
        endDate: endTime,
        now: Date.now(),
        requireFutureStart: !eventId,
      });
      const media = resolveStoredMedia({
        mediaType,
        imageUrl,
        cloudinaryPublicId,
        carouselSlides: slides,
        videoUrl,
        videoPublicId,
      });

      const payload = {
        title,
        description: description || undefined,
        date: startTime,
        endDate: endTime,
        location,
        ...media,
        capacity: capacity ? parseInt(capacity, 10) : undefined,
        customFields: customFields.length > 0 ? customFields : undefined,
        publicRegistrationEnabled,
      };

      if (eventId) {
        await updateEvent({ eventId, ...payload });
        router.push(`/dashboard/events/${eventId}`);
      } else {
        const id = await createEvent(payload);
        router.push(`/dashboard/events/${id}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save event");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{eventId ? "Edit event" : "Create event"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Event title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="date">Starts</Label>
              <Input
                id="date"
                type="datetime-local"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">Ends</Label>
              <Input
                id="endDate"
                type="datetime-local"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="capacity">Capacity (optional)</Label>
              <Input
                id="capacity"
                type="number"
                min={1}
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customFields">Custom fields (comma-separated)</Label>
              <Input
                id="customFields"
                placeholder="dietary, company"
                value={customFieldsText}
                onChange={(e) => setCustomFieldsText(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-lg border p-4">
            <input
              id="publicRegistration"
              type="checkbox"
              checked={publicRegistrationEnabled}
              onChange={(e) => setPublicRegistrationEnabled(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-input"
            />
            <div className="space-y-1">
              <Label htmlFor="publicRegistration" className="cursor-pointer">
                Enable public registration link
              </Label>
              <p className="text-xs text-muted-foreground">
                When published, anyone can register at /e/your-event-id with
                name and phone — no WhatsApp invite required.
              </p>
            </div>
          </div>

          <fieldset className="space-y-3">
            <legend className="text-sm font-medium">Invite media</legend>
            <p className="text-xs text-muted-foreground">
              Choose one. Switching type removes the other media from this event
              when you save.
            </p>
            <div className="flex flex-wrap gap-4">
              {(
                [
                  ["image", "Single image"],
                  ["carousel", "Image carousel"],
                  ["video", "Video"],
                ] as const
              ).map(([value, label]) => (
                <label key={value} className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="mediaType"
                    value={value}
                    checked={mediaType === value}
                    onChange={() => selectMediaType(value)}
                  />
                  {label}
                </label>
              ))}
            </div>

            {mediaType === "image" && (
              <div className="space-y-2">
                <Label htmlFor="banner">Event banner image</Label>
                <p className="text-xs text-muted-foreground">
                  Recommended: 1200×630 px (landscape) for best WhatsApp display.
                  Tall posters may be letterboxed or cropped.
                </p>
                <Input
                  id="banner"
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={uploading}
                />
                {imageUrl && (
                  <div className="relative mt-2 h-40 w-full overflow-hidden rounded-lg bg-muted">
                    <Image
                      src={imageUrl}
                      alt="Event banner"
                      fill
                      className="object-contain"
                    />
                  </div>
                )}
              </div>
            )}

            {mediaType === "carousel" && (
              <div className="space-y-2">
                <Label htmlFor="carousel">Carousel images</Label>
                <p className="text-xs text-muted-foreground">
                  Upload {CAROUSEL_MIN_SLIDES}–{CAROUSEL_MAX_SLIDES} images. The
                  registration page shows every slide. WhatsApp sends the full
                  carousel only when an approved template has the same number of
                  cards; otherwise the first image is sent.
                </p>
                <Input
                  id="carousel"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleCarouselUpload}
                  disabled={uploading || slides.length >= CAROUSEL_MAX_SLIDES}
                />
                <ul className="space-y-2">
                  {slides.map((slide, index) => (
                    <li
                      key={`${slide.cloudinaryPublicId}-${index}`}
                      className="flex items-center gap-3 rounded-lg border p-2"
                    >
                      <div className="relative h-14 w-24 shrink-0 overflow-hidden rounded bg-muted">
                        <Image
                          src={slide.imageUrl}
                          alt={`Slide ${index + 1}`}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {index + 1}
                      </span>
                      <div className="ml-auto flex gap-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={index === 0}
                          onClick={() => moveSlide(index, -1)}
                        >
                          Up
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={index === slides.length - 1}
                          onClick={() => moveSlide(index, 1)}
                        >
                          Down
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setSlides((current) =>
                              current.filter((_, slideIndex) => slideIndex !== index)
                            )
                          }
                        >
                          Remove
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {mediaType === "video" && (
              <div className="space-y-2">
                <Label htmlFor="video">Invite video</Label>
                <p className="text-xs text-muted-foreground">
                  MP4 only, up to 16 MB and {WHATSAPP_VIDEO_MAX_SECONDS} seconds.
                  WhatsApp sends it when a video template is configured.
                </p>
                <Input
                  id="video"
                  type="file"
                  accept="video/mp4,.mp4"
                  onChange={handleVideoUpload}
                  disabled={uploading}
                />
                {videoUrl && (
                  <video
                    src={videoUrl}
                    controls
                    className="mt-2 aspect-video w-full rounded-lg bg-black"
                  />
                )}
              </div>
            )}
          </fieldset>

          {uploading && (
            <p className="text-sm text-muted-foreground">Uploading...</p>
          )}
          {bannerAspectWarning && mediaType === "image" && (
            <p className="text-sm text-amber-600 dark:text-amber-500">
              {bannerAspectWarning}
            </p>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex gap-2">
            <Button type="submit" disabled={loading || uploading}>
              {loading ? "Saving..." : eventId ? "Update event" : "Create event"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
