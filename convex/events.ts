import { v } from "convex/values";
import { authedMutation, authedQuery, requireEventOrganizer } from "./lib/auth";
import {
  carouselSlideValidator,
  mediaTypeValidator,
} from "./lib/eventFields";
import {
  assertEventSchedule,
  resolveStoredMedia,
  type StoredMedia,
} from "./lib/inviteMedia";

const eventStatusValidator = v.union(
  v.literal("draft"),
  v.literal("published"),
  v.literal("completed")
);

const eventDocValidator = v.object({
  _id: v.id("events"),
  _creationTime: v.number(),
  organizerId: v.id("users"),
  title: v.string(),
  description: v.optional(v.string()),
  date: v.number(),
  endDate: v.optional(v.number()),
  location: v.string(),
  mediaType: v.optional(mediaTypeValidator),
  cloudinaryPublicId: v.optional(v.string()),
  imageUrl: v.optional(v.string()),
  carouselSlides: v.optional(v.array(carouselSlideValidator)),
  videoUrl: v.optional(v.string()),
  videoPublicId: v.optional(v.string()),
  capacity: v.optional(v.number()),
  registrationDeadline: v.optional(v.number()),
  customFields: v.optional(v.array(v.string())),
  publicRegistrationEnabled: v.optional(v.boolean()),
  status: eventStatusValidator,
  createdAt: v.number(),
  updatedAt: v.optional(v.number()),
});

export const list = authedQuery({
  args: {},
  handler: async (ctx) => {
    const events = await ctx.db
      .query("events")
      .withIndex("by_organizer", (q) => q.eq("organizerId", ctx.user._id))
      .order("desc")
      .collect();
    return events;
  },
});

export const get = authedQuery({
  args: { eventId: v.id("events") },
  returns: v.union(eventDocValidator, v.null()),
  handler: async (ctx, args) => {
    const event = await ctx.db.get("events", args.eventId);
    if (!event) {
      return null;
    }
    if (event.organizerId !== ctx.user._id) {
      throw new Error("Unauthorized: You don't own this event");
    }
    return event;
  },
});

export const create = authedMutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    date: v.number(),
    endDate: v.optional(v.union(v.number(), v.null())),
    location: v.string(),
    mediaType: v.optional(mediaTypeValidator),
    cloudinaryPublicId: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    carouselSlides: v.optional(v.array(carouselSlideValidator)),
    videoUrl: v.optional(v.string()),
    videoPublicId: v.optional(v.string()),
    capacity: v.optional(v.number()),
    registrationDeadline: v.optional(v.number()),
    customFields: v.optional(v.array(v.string())),
    publicRegistrationEnabled: v.optional(v.boolean()),
  },
  returns: v.id("events"),
  handler: async (ctx, args) => {
    if (args.title.length < 2) {
      throw new Error("Event title must be at least 2 characters");
    }
    assertEventSchedule({
      date: args.date,
      endDate: args.endDate,
      now: Date.now(),
      requireFutureStart: true,
    });
    const media = resolveStoredMedia(args);

    const eventId = await ctx.db.insert("events", {
      organizerId: ctx.user._id,
      title: args.title,
      ...(args.description !== undefined ? { description: args.description } : {}),
      date: args.date,
      ...(args.endDate != null ? { endDate: args.endDate } : {}),
      location: args.location,
      ...storedMediaFields(media),
      ...(args.capacity !== undefined ? { capacity: args.capacity } : {}),
      ...(args.registrationDeadline !== undefined
        ? { registrationDeadline: args.registrationDeadline }
        : {}),
      ...(args.customFields !== undefined
        ? { customFields: args.customFields }
        : {}),
      publicRegistrationEnabled: args.publicRegistrationEnabled ?? false,
      status: "draft",
      createdAt: Date.now(),
    });
    return eventId;
  },
});

export const update = authedMutation({
  args: {
    eventId: v.id("events"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    date: v.optional(v.number()),
    endDate: v.optional(v.union(v.number(), v.null())),
    location: v.optional(v.string()),
    mediaType: v.optional(mediaTypeValidator),
    cloudinaryPublicId: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    carouselSlides: v.optional(v.array(carouselSlideValidator)),
    videoUrl: v.optional(v.string()),
    videoPublicId: v.optional(v.string()),
    capacity: v.optional(v.number()),
    registrationDeadline: v.optional(v.number()),
    customFields: v.optional(v.array(v.string())),
    publicRegistrationEnabled: v.optional(v.boolean()),
    status: v.optional(
      v.union(
        v.literal("draft"),
        v.literal("published"),
        v.literal("completed")
      )
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireEventOrganizer(ctx, args.eventId);
    const event = await ctx.db.get("events", args.eventId);
    if (!event) {
      throw new Error("Event not found");
    }

    const { eventId, ...updates } = args;
    const nextDate = updates.date ?? event.date;
    const nextEndDate =
      updates.endDate === undefined ? event.endDate : updates.endDate;
    if (updates.date !== undefined || updates.endDate !== undefined) {
      assertEventSchedule({
        date: nextDate,
        endDate: nextEndDate,
        now: Date.now(),
        requireFutureStart: false,
      });
    }

    const patch: {
      updatedAt: number;
      title?: string;
      description?: string;
      date?: number;
      endDate?: number;
      location?: string;
      mediaType?: StoredMedia["mediaType"];
      cloudinaryPublicId?: string;
      imageUrl?: string;
      carouselSlides?: StoredMedia["carouselSlides"];
      videoUrl?: string;
      videoPublicId?: string;
      capacity?: number;
      registrationDeadline?: number;
      customFields?: string[];
      publicRegistrationEnabled?: boolean;
      status?: "draft" | "published" | "completed";
    } = { updatedAt: Date.now() };

    if (updates.title !== undefined) patch.title = updates.title;
    if (updates.description !== undefined) patch.description = updates.description;
    if (updates.date !== undefined) patch.date = updates.date;
    if (updates.endDate === null) {
      patch.endDate = undefined;
    } else if (updates.endDate !== undefined) {
      patch.endDate = updates.endDate;
    }
    if (updates.location !== undefined) patch.location = updates.location;
    if (updates.mediaType !== undefined) {
      const media = resolveStoredMedia({
        mediaType: updates.mediaType,
        imageUrl: updates.imageUrl,
        cloudinaryPublicId: updates.cloudinaryPublicId,
        carouselSlides: updates.carouselSlides,
        videoUrl: updates.videoUrl,
        videoPublicId: updates.videoPublicId,
      });
      patch.mediaType = media.mediaType;
      patch.imageUrl = media.imageUrl;
      patch.cloudinaryPublicId = media.cloudinaryPublicId;
      patch.carouselSlides = media.carouselSlides;
      patch.videoUrl = media.videoUrl;
      patch.videoPublicId = media.videoPublicId;
    }
    if (updates.capacity !== undefined) patch.capacity = updates.capacity;
    if (updates.registrationDeadline !== undefined)
      patch.registrationDeadline = updates.registrationDeadline;
    if (updates.customFields !== undefined)
      patch.customFields = updates.customFields;
    if (updates.publicRegistrationEnabled !== undefined)
      patch.publicRegistrationEnabled = updates.publicRegistrationEnabled;
    if (updates.status !== undefined) patch.status = updates.status;

    await ctx.db.patch("events", eventId, patch);
    return null;
  },
});

export const remove = authedMutation({
  args: { eventId: v.id("events") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireEventOrganizer(ctx, args.eventId);

    const registrations = await ctx.db
      .query("registrations")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();

    for (const registration of registrations) {
      await ctx.db.delete("registrations", registration._id);
    }

    const invites = await ctx.db
      .query("invites")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();

    for (const invite of invites) {
      await ctx.db.delete("invites", invite._id);
    }

    const messageLogs = await ctx.db
      .query("messageLogs")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();

    for (const log of messageLogs) {
      await ctx.db.delete("messageLogs", log._id);
    }

    await ctx.db.delete("events", args.eventId);
    return null;
  },
});

function storedMediaFields(media: StoredMedia) {
  return {
    mediaType: media.mediaType,
    ...(media.imageUrl !== undefined ? { imageUrl: media.imageUrl } : {}),
    ...(media.cloudinaryPublicId !== undefined
      ? { cloudinaryPublicId: media.cloudinaryPublicId }
      : {}),
    ...(media.carouselSlides !== undefined
      ? { carouselSlides: media.carouselSlides }
      : {}),
    ...(media.videoUrl !== undefined ? { videoUrl: media.videoUrl } : {}),
    ...(media.videoPublicId !== undefined
      ? { videoPublicId: media.videoPublicId }
      : {}),
  };
}

export const getStats = authedQuery({
  args: { eventId: v.id("events") },
  returns: v.object({
    invited: v.number(),
    delivered: v.number(),
    registered: v.number(),
    confirmed: v.number(),
    declined: v.number(),
  }),
  handler: async (ctx, args) => {
    await requireEventOrganizer(ctx, args.eventId);

    const invites = await ctx.db
      .query("invites")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();

    const registrations = await ctx.db
      .query("registrations")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();

    return {
      invited: invites.length,
      delivered: invites.filter(
        (i) =>
          i.deliveryStatus === "delivered" || i.deliveryStatus === "read"
      ).length,
      registered: registrations.filter((r) => r.rsvpStatus === "registered")
        .length,
      confirmed: registrations.filter(
        (r) => r.attendanceStatus === "confirmed" || r.attendanceStatus === "checked_in"
      ).length,
      declined: registrations.filter(
        (r) =>
          r.rsvpStatus === "declined" || r.attendanceStatus === "declined"
      ).length,
    };
  },
});
