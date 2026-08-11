import { v } from "convex/values";
import { internal } from "./_generated/api";
import { authedMutation, authedQuery, requireEventOrganizer } from "./lib/auth";
import { parseCsvPhones, parsePhoneList } from "./lib/phones";

function generateToken(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export const listByEvent = authedQuery({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    await requireEventOrganizer(ctx, args.eventId);

    const invites = await ctx.db
      .query("invites")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();

    const result = [];
    for (const invite of invites) {
      const registration = await ctx.db
        .query("registrations")
        .withIndex("by_invite", (q) => q.eq("inviteId", invite._id))
        .unique();

      result.push({
        _id: invite._id,
        _creationTime: invite._creationTime,
        eventId: invite.eventId,
        phone: invite.phone,
        token: invite.token,
        inviteeName: invite.inviteeName,
        deliveryStatus: invite.deliveryStatus,
        twilioMessageSid: invite.twilioMessageSid,
        sentAt: invite.sentAt,
        failureReason: invite.failureReason,
        createdAt: invite.createdAt,
        rsvpStatus: registration?.rsvpStatus,
        attendanceStatus: registration?.attendanceStatus,
        registrationName: registration?.name,
      });
    }

    return result;
  },
});

export const addInvitees = authedMutation({
  args: {
    eventId: v.id("events"),
    phonesText: v.optional(v.string()),
    csvContent: v.optional(v.string()),
  },
  returns: v.object({
    added: v.number(),
    skipped: v.number(),
  }),
  handler: async (ctx, args) => {
    await requireEventOrganizer(ctx, args.eventId);

    let phones: string[] = [];
    if (args.csvContent) {
      phones = parseCsvPhones(args.csvContent);
    } else if (args.phonesText) {
      phones = parsePhoneList(args.phonesText);
    } else {
      throw new Error("Provide phone numbers via paste or CSV");
    }

    let added = 0;
    let skipped = 0;

    for (const phone of phones) {
      const eventInvites = await ctx.db
        .query("invites")
        .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
        .collect();

      const existing = eventInvites.find((i) => i.phone === phone);

      if (existing) {
        skipped++;
        continue;
      }

      await ctx.db.insert("invites", {
        eventId: args.eventId,
        phone,
        token: generateToken(),
        deliveryStatus: "pending",
        createdAt: Date.now(),
      });
      added++;
    }

    return { added, skipped };
  },
});

export const sendInvites = authedMutation({
  args: {
    eventId: v.id("events"),
    inviteIds: v.optional(v.array(v.id("invites"))),
  },
  returns: v.object({ queued: v.number() }),
  handler: async (ctx, args) => {
    await requireEventOrganizer(ctx, args.eventId);

    let invites;
    if (args.inviteIds && args.inviteIds.length > 0) {
      invites = [];
      for (const id of args.inviteIds) {
        const invite = await ctx.db.get("invites", id);
        if (invite && invite.eventId === args.eventId) {
          invites.push(invite);
        }
      }
    } else {
      invites = await ctx.db
        .query("invites")
        .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
        .collect();
      invites = invites.filter(
        (i) => i.deliveryStatus === "pending" || i.deliveryStatus === "failed"
      );
    }

    for (let i = 0; i < invites.length; i++) {
      await ctx.scheduler.runAfter(
        i * 1000,
        internal.twilio.sendInvite,
        { inviteId: invites[i]!._id }
      );
    }

    return { queued: invites.length };
  },
});

export const resendFailed = authedMutation({
  args: { eventId: v.id("events") },
  returns: v.object({ queued: v.number() }),
  handler: async (ctx, args) => {
    await requireEventOrganizer(ctx, args.eventId);

    const failed = await ctx.db
      .query("invites")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();

    const toResend = failed.filter((i) => i.deliveryStatus === "failed");

    for (let i = 0; i < toResend.length; i++) {
      await ctx.scheduler.runAfter(
        i * 1000,
        internal.twilio.sendInvite,
        { inviteId: toResend[i]!._id }
      );
    }

    return { queued: toResend.length };
  },
});

export const resendOne = authedMutation({
  args: { inviteId: v.id("invites") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const invite = await ctx.db.get("invites", args.inviteId);
    if (!invite) throw new Error("Invite not found");
    await requireEventOrganizer(ctx, invite.eventId);

    await ctx.scheduler.runAfter(0, internal.twilio.sendInvite, {
      inviteId: args.inviteId,
    });
    return null;
  },
});

export const sendReminders = authedMutation({
  args: { eventId: v.id("events") },
  returns: v.object({ queued: v.number() }),
  handler: async (ctx, args) => {
    await requireEventOrganizer(ctx, args.eventId);

    const registrations = await ctx.db
      .query("registrations")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();

    const toRemind = registrations.filter(
      (r) =>
        r.rsvpStatus === "registered" && r.attendanceStatus === "unknown"
    );

    for (let i = 0; i < toRemind.length; i++) {
      await ctx.scheduler.runAfter(
        i * 1000,
        internal.twilio.sendReminder,
        { registrationId: toRemind[i]!._id }
      );
    }

    return { queued: toRemind.length };
  },
});
