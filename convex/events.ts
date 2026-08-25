import { v } from "convex/values";
import { authedMutation, authedQuery, requireEventOrganizer } from "./lib/auth";

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
  location: v.string(),
  cloudinaryPublicId: v.optional(v.string()),
  imageUrl: v.optional(v.string()),
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
    location: v.string(),
    cloudinaryPublicId: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
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
    if (args.date <= Date.now()) {
      throw new Error("Event date must be in the future");
    }

    const eventId = await ctx.db.insert("events", {
      organizerId: ctx.user._id,
      title: args.title,
      ...(args.description !== undefined ? { description: args.description } : {}),
      date: args.date,
      location: args.location,
      ...(args.cloudinaryPublicId !== undefined
        ? { cloudinaryPublicId: args.cloudinaryPublicId }
        : {}),
      ...(args.imageUrl !== undefined ? { imageUrl: args.imageUrl } : {}),
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
    location: v.optional(v.string()),
    cloudinaryPublicId: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
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

    const { eventId, ...updates } = args;
    const patch: Record<string, unknown> = { updatedAt: Date.now() };

    if (updates.title !== undefined) patch.title = updates.title;
    if (updates.description !== undefined) patch.description = updates.description;
    if (updates.date !== undefined) patch.date = updates.date;
    if (updates.location !== undefined) patch.location = updates.location;
    if (updates.cloudinaryPublicId !== undefined)
      patch.cloudinaryPublicId = updates.cloudinaryPublicId;
    if (updates.imageUrl !== undefined) patch.imageUrl = updates.imageUrl;
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
