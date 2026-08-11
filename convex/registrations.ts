import { v } from "convex/values";
import { internal } from "./_generated/api";
import { mutation, query } from "./_generated/server";

const publicEventValidator = v.object({
  _id: v.id("events"),
  title: v.string(),
  description: v.optional(v.string()),
  date: v.number(),
  location: v.string(),
  imageUrl: v.optional(v.string()),
  capacity: v.optional(v.number()),
  registrationDeadline: v.optional(v.number()),
  customFields: v.optional(v.array(v.string())),
  registeredCount: v.number(),
});

export const getInviteByToken = query({
  args: { token: v.string() },
  returns: v.union(
    v.object({
      invite: v.object({
        _id: v.id("invites"),
        phone: v.string(),
        inviteeName: v.optional(v.string()),
      }),
      event: publicEventValidator,
      alreadyRegistered: v.boolean(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const invite = await ctx.db
      .query("invites")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();

    if (!invite) return null;

    const event = await ctx.db.get("events", invite.eventId);
    if (!event || event.status === "completed") return null;

    const existingRegistration = await ctx.db
      .query("registrations")
      .withIndex("by_invite", (q) => q.eq("inviteId", invite._id))
      .unique();

    const registrations = await ctx.db
      .query("registrations")
      .withIndex("by_event", (q) => q.eq("eventId", event._id))
      .collect();

    return {
      invite: {
        _id: invite._id,
        phone: invite.phone,
        inviteeName: invite.inviteeName,
      },
      event: {
        _id: event._id,
        title: event.title,
        description: event.description,
        date: event.date,
        location: event.location,
        imageUrl: event.imageUrl,
        capacity: event.capacity,
        registrationDeadline: event.registrationDeadline,
        customFields: event.customFields,
        registeredCount: registrations.filter(
          (r) => r.rsvpStatus === "registered"
        ).length,
      },
      alreadyRegistered: existingRegistration?.rsvpStatus === "registered",
    };
  },
});

export const register = mutation({
  args: {
    token: v.string(),
    name: v.string(),
    email: v.optional(v.string()),
    customResponses: v.optional(v.record(v.string(), v.string())),
  },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, args) => {
    const invite = await ctx.db
      .query("invites")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();

    if (!invite) {
      throw new Error("Invalid or expired invite link");
    }

    const event = await ctx.db.get("events", invite.eventId);
    if (!event) {
      throw new Error("Event not found");
    }

    if (event.status === "completed") {
      throw new Error("This event has ended");
    }

    if (
      event.registrationDeadline &&
      Date.now() > event.registrationDeadline
    ) {
      throw new Error("Registration deadline has passed");
    }

    const existing = await ctx.db
      .query("registrations")
      .withIndex("by_invite", (q) => q.eq("inviteId", invite._id))
      .unique();

    if (existing?.rsvpStatus === "registered") {
      throw new Error("You have already registered for this event");
    }

    if (event.capacity) {
      const registrations = await ctx.db
        .query("registrations")
        .withIndex("by_event", (q) => q.eq("eventId", event._id))
        .collect();
      const registeredCount = registrations.filter(
        (r) => r.rsvpStatus === "registered"
      ).length;
      if (registeredCount >= event.capacity) {
        throw new Error("This event is at full capacity");
      }
    }

    if (args.name.length < 2) {
      throw new Error("Name must be at least 2 characters");
    }

    // Basic rate limiting: max 10 registration attempts per invite
    const attemptCount = invite.registrationAttempts ?? 0;
    if (attemptCount >= 10) {
      throw new Error("Too many registration attempts. Please contact the organizer.");
    }
    await ctx.db.patch("invites", invite._id, {
      registrationAttempts: attemptCount + 1,
    });

    let registrationId;
    if (existing) {
      await ctx.db.patch("registrations", existing._id, {
        name: args.name,
        email: args.email,
        customResponses: args.customResponses,
        rsvpStatus: "registered",
        attendanceStatus: "unknown",
        registeredAt: Date.now(),
      });
      registrationId = existing._id;
    } else {
      registrationId = await ctx.db.insert("registrations", {
        eventId: event._id,
        inviteId: invite._id,
        phone: invite.phone,
        name: args.name,
        email: args.email,
        customResponses: args.customResponses,
        rsvpStatus: "registered",
        attendanceStatus: "unknown",
        registeredAt: Date.now(),
      });
    }

    await ctx.scheduler.runAfter(0, internal.twilio.sendRsvpConfirmation, {
      registrationId,
    });

    return { success: true };
  },
});

export const listByEvent = query({
  args: { eventId: v.id("events") },
  returns: v.array(
    v.object({
      _id: v.id("registrations"),
      name: v.string(),
      phone: v.string(),
      email: v.optional(v.string()),
      rsvpStatus: v.union(
        v.literal("pending"),
        v.literal("registered"),
        v.literal("declined")
      ),
      attendanceStatus: v.union(
        v.literal("unknown"),
        v.literal("confirmed"),
        v.literal("declined"),
        v.literal("checked_in")
      ),
      registeredAt: v.optional(v.number()),
      confirmedAt: v.optional(v.number()),
    })
  ),
  handler: async (ctx, args) => {
    const registrations = await ctx.db
      .query("registrations")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();

    return registrations.map((r) => ({
      _id: r._id,
      name: r.name,
      phone: r.phone,
      email: r.email,
      rsvpStatus: r.rsvpStatus,
      attendanceStatus: r.attendanceStatus,
      registeredAt: r.registeredAt,
      confirmedAt: r.confirmedAt,
    }));
  },
});
