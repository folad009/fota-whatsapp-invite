"use client";

import { useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Image from "next/image";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
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

interface EventFormProps {
  eventId?: Id<"events">;
  initial?: {
    title: string;
    description?: string;
    date: number;
    location: string;
    imageUrl?: string;
    cloudinaryPublicId?: string;
    capacity?: number;
    customFields?: string[];
  };
}

export function EventForm({ eventId, initial }: EventFormProps) {
  const router = useRouter();
  const createEvent = useMutation(api.events.create);
  const updateEvent = useMutation(api.events.update);

  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [date, setDate] = useState(
    initial?.date
      ? new Date(initial.date).toISOString().slice(0, 16)
      : ""
  );
  const [location, setLocation] = useState(initial?.location ?? "");
  const [capacity, setCapacity] = useState(initial?.capacity?.toString() ?? "");
  const [customFieldsText, setCustomFieldsText] = useState(
    initial?.customFields?.join(", ") ?? ""
  );
  const [imageUrl, setImageUrl] = useState(initial?.imageUrl ?? "");
  const [cloudinaryPublicId, setCloudinaryPublicId] = useState(
    initial?.cloudinaryPublicId ?? ""
  );
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError("");

    try {
      const signRes = await fetch("/api/cloudinary/sign");
      const signData = await signRes.json();

      const formData = new FormData();
      formData.append("file", file);
      formData.append("api_key", signData.apiKey);
      formData.append("timestamp", signData.timestamp.toString());
      formData.append("signature", signData.signature);
      formData.append("folder", signData.folder);
      formData.append("transformation", "c_fill,w_1200,h_630,g_auto");

      const uploadRes = await fetch(
        `https://api.cloudinary.com/v1_1/${signData.cloudName}/image/upload`,
        { method: "POST", body: formData }
      );

      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) {
        throw new Error(uploadData.error?.message ?? "Upload failed");
      }

      setImageUrl(uploadData.secure_url);
      setCloudinaryPublicId(uploadData.public_id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Image upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const customFields = customFieldsText
        .split(",")
        .map((f) => f.trim())
        .filter(Boolean);

      const payload = {
        title,
        description: description || undefined,
        date: new Date(date).getTime(),
        location,
        imageUrl: imageUrl || undefined,
        cloudinaryPublicId: cloudinaryPublicId || undefined,
        capacity: capacity ? parseInt(capacity, 10) : undefined,
        customFields: customFields.length > 0 ? customFields : undefined,
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
              <Label htmlFor="date">Date & time</Label>
              <Input
                id="date"
                type="datetime-local"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
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

          <div className="space-y-2">
            <Label htmlFor="banner">Event banner image</Label>
            <Input
              id="banner"
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              disabled={uploading}
            />
            {uploading && (
              <p className="text-sm text-muted-foreground">Uploading...</p>
            )}
            {imageUrl && (
              <div className="relative mt-2 h-40 w-full overflow-hidden rounded-lg">
                <Image
                  src={imageUrl}
                  alt="Event banner"
                  fill
                  className="object-cover"
                />
              </div>
            )}
          </div>

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
