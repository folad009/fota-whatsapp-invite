import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";

export const logMessage = internalMutation({
  args: {
    inviteId: v.optional(v.id("invites")),
    eventId: v.optional(v.id("events")),
    direction: v.union(v.literal("inbound"), v.literal("outbound")),
    body: v.string(),
    twilioSid: v.optional(v.string()),
    status: v.optional(v.string()),
  },
  returns: v.id("messageLogs"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("messageLogs", {
      ...args,
      createdAt: Date.now(),
    });
  },
});

export const updateInviteDelivery = internalMutation({
  args: {
    inviteId: v.id("invites"),
    deliveryStatus: v.union(
      v.literal("pending"),
      v.literal("sent"),
      v.literal("delivered"),
      v.literal("failed"),
      v.literal("read")
    ),
    twilioMessageSid: v.optional(v.string()),
    failureReason: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const patch: Record<string, unknown> = {
      deliveryStatus: args.deliveryStatus,
    };
    if (args.twilioMessageSid) patch.twilioMessageSid = args.twilioMessageSid;
    if (args.failureReason) patch.failureReason = args.failureReason;
    if (args.deliveryStatus === "sent") patch.sentAt = Date.now();

    await ctx.db.patch("invites", args.inviteId, patch);
    return null;
  },
});

export const updateRegistrationFromReply = internalMutation({
  args: {
    phone: v.string(),
    eventId: v.optional(v.id("events")),
    rsvpStatus: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("registered"),
        v.literal("declined")
      )
    ),
    attendanceStatus: v.optional(
      v.union(
        v.literal("unknown"),
        v.literal("confirmed"),
        v.literal("declined"),
        v.literal("checked_in")
      )
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    let registrations;

    if (args.eventId) {
      registrations = await ctx.db
        .query("registrations")
        .withIndex("by_event", (q) => q.eq("eventId", args.eventId!))
        .collect();
      registrations = registrations.filter((r) => r.phone === args.phone);
    } else {
      const allInvites = await ctx.db
        .query("invites")
        .withIndex("by_phone", (q) => q.eq("phone", args.phone))
        .collect();

      registrations = [];
      for (const invite of allInvites) {
        const reg = await ctx.db
          .query("registrations")
          .withIndex("by_invite", (q) => q.eq("inviteId", invite._id))
          .unique();
        if (reg) registrations.push(reg);
      }
    }

    // Update most recent active registration
    const active = registrations
      .filter((r) => r.rsvpStatus === "registered")
      .sort((a, b) => (b.registeredAt ?? 0) - (a.registeredAt ?? 0))[0];

    if (!active) {
      // Handle decline on invite without registration
      if (args.rsvpStatus === "declined") {
        const invites = await ctx.db
          .query("invites")
          .withIndex("by_phone", (q) => q.eq("phone", args.phone))
          .collect();
        const latestInvite = invites.sort(
          (a, b) => b.createdAt - a.createdAt
        )[0];
        if (latestInvite) {
          const existing = await ctx.db
            .query("registrations")
            .withIndex("by_invite", (q) => q.eq("inviteId", latestInvite._id))
            .unique();
          if (!existing) {
            await ctx.db.insert("registrations", {
              eventId: latestInvite.eventId,
              inviteId: latestInvite._id,
              phone: args.phone,
              name: latestInvite.inviteeName ?? "Guest",
              rsvpStatus: "declined",
              attendanceStatus: "declined",
            });
          }
        }
      }
      return null;
    }

    const patch: Record<string, unknown> = {};
    if (args.rsvpStatus) patch.rsvpStatus = args.rsvpStatus;
    if (args.attendanceStatus) {
      patch.attendanceStatus = args.attendanceStatus;
      if (
        args.attendanceStatus === "confirmed" ||
        args.attendanceStatus === "checked_in"
      ) {
        patch.confirmedAt = Date.now();
      }
    }

    await ctx.db.patch("registrations", active._id, patch);
    return null;
  },
});

export const getMessageBySid = internalQuery({
  args: { twilioSid: v.string() },
  returns: v.union(v.id("messageLogs"), v.null()),
  handler: async (ctx, args) => {
    const log = await ctx.db
      .query("messageLogs")
      .withIndex("by_twilio_sid", (q) => q.eq("twilioSid", args.twilioSid))
      .unique();
    return log?._id ?? null;
  },
});
