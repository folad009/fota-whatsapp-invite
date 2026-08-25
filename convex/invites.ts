import { v } from "convex/values";
import { Doc, Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { MutationCtx } from "./_generated/server";
import { authedMutation, authedQuery, requireEventOrganizer } from "./lib/auth";
import { generateInviteToken } from "./lib/tokens";
import { CsvInviteeRow, parseCsvInvitees, parsePhoneList } from "./lib/phones";

function isEligibleForAttendanceReminder(
  registration: Doc<"registrations"> | null,
  eventId: Id<"events">
): registration is Doc<"registrations"> {
  return (
    registration !== null &&
    registration.eventId === eventId &&
    registration.rsvpStatus === "registered" &&
    registration.attendanceStatus === "unknown"
  );
}

async function queueAttendanceReminders(
  ctx: MutationCtx,
  eventId: Id<"events">,
  registrationIds: Id<"registrations">[]
): Promise<number> {
  const toRemind: Id<"registrations">[] = [];

  for (const registrationId of registrationIds) {
    const registration = await ctx.db.get("registrations", registrationId);
    if (isEligibleForAttendanceReminder(registration, eventId)) {
      toRemind.push(registration._id);
    }
  }

  for (let i = 0; i < toRemind.length; i++) {
    await ctx.scheduler.runAfter(i * 1000, internal.twilio.sendReminder, {
      registrationId: toRemind[i]!,
    });
  }

  return toRemind.length;
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
        registrationId: registration?._id,
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

    let invitees: CsvInviteeRow[] = [];
    if (args.csvContent) {
      invitees = parseCsvInvitees(args.csvContent);
    } else if (args.phonesText) {
      invitees = parsePhoneList(args.phonesText).map((phone) => ({ phone }));
    } else {
      throw new Error("Provide phone numbers via paste or CSV");
    }

    let added = 0;
    let skipped = 0;

    for (const invitee of invitees) {
      const eventInvites = await ctx.db
        .query("invites")
        .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
        .collect();

      const existing = eventInvites.find((i) => i.phone === invitee.phone);

      if (existing) {
        skipped++;
        continue;
      }

      await ctx.db.insert("invites", {
        eventId: args.eventId,
        phone: invitee.phone,
        inviteeName: invitee.inviteeName,
        token: generateInviteToken(),
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
  args: {
    eventId: v.id("events"),
    registrationIds: v.optional(v.array(v.id("registrations"))),
  },
  returns: v.object({ queued: v.number() }),
  handler: async (ctx, args) => {
    await requireEventOrganizer(ctx, args.eventId);

    if (args.registrationIds && args.registrationIds.length > 0) {
      const queued = await queueAttendanceReminders(
        ctx,
        args.eventId,
        args.registrationIds
      );
      return { queued };
    }

    const registrations = await ctx.db
      .query("registrations")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();

    const toRemind = registrations.filter(
      (r) =>
        r.rsvpStatus === "registered" && r.attendanceStatus === "unknown"
    );

    const queued = await queueAttendanceReminders(
      ctx,
      args.eventId,
      toRemind.map((r) => r._id)
    );
    return { queued };
  },
});

export const sendReminderOne = authedMutation({
  args: { registrationId: v.id("registrations") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const registration = await ctx.db.get("registrations", args.registrationId);
    if (!registration) {
      throw new Error("Registration not found");
    }
    await requireEventOrganizer(ctx, registration.eventId);

    if (!isEligibleForAttendanceReminder(registration, registration.eventId)) {
      throw new Error("This guest is not eligible for an attendance reminder");
    }

    await ctx.scheduler.runAfter(0, internal.twilio.sendReminder, {
      registrationId: args.registrationId,
    });
    return null;
  },
});
