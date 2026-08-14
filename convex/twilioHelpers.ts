import { v } from "convex/values";
import { internalQuery } from "./_generated/server";

export const getInviteData = internalQuery({
  args: { inviteId: v.id("invites") },
  returns: v.union(
    v.object({
      invite: v.object({
        _id: v.id("invites"),
        phone: v.string(),
        token: v.string(),
        inviteeName: v.optional(v.string()),
      }),
      event: v.object({
        _id: v.id("events"),
        title: v.string(),
        date: v.number(),
        location: v.string(),
        description: v.optional(v.string()),
        cloudinaryPublicId: v.optional(v.string()),
        imageUrl: v.optional(v.string()),
      }),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const invite = await ctx.db.get("invites", args.inviteId);
    if (!invite) return null;

    const event = await ctx.db.get("events", invite.eventId);
    if (!event) return null;

    return {
      invite: {
        _id: invite._id,
        phone: invite.phone,
        token: invite.token,
        inviteeName: invite.inviteeName,
      },
      event: {
        _id: event._id,
        title: event.title,
        date: event.date,
        location: event.location,
        description: event.description,
        cloudinaryPublicId: event.cloudinaryPublicId,
        imageUrl: event.imageUrl,
      },
    };
  },
});

export const getRegistrationData = internalQuery({
  args: { registrationId: v.id("registrations") },
  returns: v.union(
    v.object({
      registration: v.object({
        _id: v.id("registrations"),
        inviteId: v.id("invites"),
        phone: v.string(),
        name: v.string(),
      }),
      event: v.object({
        _id: v.id("events"),
        title: v.string(),
        date: v.number(),
      }),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const registration = await ctx.db.get("registrations", args.registrationId);
    if (!registration) return null;

    const event = await ctx.db.get("events", registration.eventId);
    if (!event) return null;

    return {
      registration: {
        _id: registration._id,
        inviteId: registration.inviteId,
        phone: registration.phone,
        name: registration.name,
      },
      event: {
        _id: event._id,
        title: event.title,
        date: event.date,
      },
    };
  },
});

export const getEventsForReminder = internalQuery({
  args: {
    windowStart: v.number(),
    windowEnd: v.number(),
  },
  returns: v.array(v.id("events")),
  handler: async (ctx, args) => {
    const events = await ctx.db.query("events").collect();
    return events
      .filter(
        (e) =>
          e.status === "published" &&
          e.date >= args.windowStart &&
          e.date <= args.windowEnd
      )
      .map((e) => e._id);
  },
});

export const getRegistrationsForReminder = internalQuery({
  args: { eventId: v.id("events") },
  returns: v.array(v.id("registrations")),
  handler: async (ctx, args) => {
    const registrations = await ctx.db
      .query("registrations")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();

    return registrations
      .filter(
        (r) =>
          r.rsvpStatus === "registered" && r.attendanceStatus === "unknown"
      )
      .map((r) => r._id);
  },
});

export const findInviteByPhone = internalQuery({
  args: { phone: v.string() },
  returns: v.union(v.id("invites"), v.null()),
  handler: async (ctx, args) => {
    const invites = await ctx.db
      .query("invites")
      .withIndex("by_phone", (q) => q.eq("phone", args.phone))
      .collect();

    const latest = invites.sort((a, b) => b.createdAt - a.createdAt)[0];
    return latest?._id ?? null;
  },
});
