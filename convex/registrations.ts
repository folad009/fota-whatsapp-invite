import { v } from "convex/values";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { mutation, query, QueryCtx, MutationCtx } from "./_generated/server";
import { isValidE164, normalizePhone } from "./lib/phones";
import { generateInviteToken } from "./lib/tokens";

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
  publicRegistrationEnabled: v.optional(v.boolean()),
});

async function getRegisteredCount(
  ctx: QueryCtx | MutationCtx,
  eventId: Id<"events">
): Promise<number> {
  const registrations = await ctx.db
    .query("registrations")
    .withIndex("by_event", (q) => q.eq("eventId", eventId))
    .collect();
  return registrations.filter((r) => r.rsvpStatus === "registered").length;
}

function assertEventOpenForRegistration(
  event: {
    status: string;
    registrationDeadline?: number;
    capacity?: number;
  },
  registeredCount: number
): void {
  if (event.status === "completed") {
    throw new Error("This event has ended");
  }

  if (
    event.registrationDeadline &&
    Date.now() > event.registrationDeadline
  ) {
    throw new Error("Registration deadline has passed");
  }

  if (event.capacity && registeredCount >= event.capacity) {
    throw new Error("This event is at full capacity");
  }
}

function toPublicEventFields(
  event: {
    _id: Id<"events">;
    title: string;
    description?: string;
    date: number;
    location: string;
    imageUrl?: string;
    capacity?: number;
    registrationDeadline?: number;
    customFields?: string[];
    publicRegistrationEnabled?: boolean;
  },
  registeredCount: number
) {
  return {
    _id: event._id,
    title: event.title,
    description: event.description,
    date: event.date,
    location: event.location,
    imageUrl: event.imageUrl,
    capacity: event.capacity,
    registrationDeadline: event.registrationDeadline,
    customFields: event.customFields,
    registeredCount,
    publicRegistrationEnabled: event.publicRegistrationEnabled,
  };
}

export const getPublicEvent = query({
  args: { eventId: v.id("events") },
  returns: v.union(publicEventValidator, v.null()),
  handler: async (ctx, args) => {
    const event = await ctx.db.get("events", args.eventId);
    if (!event) return null;
    if (event.status !== "published") return null;
    if (!event.publicRegistrationEnabled) return null;

    const registeredCount = await getRegisteredCount(ctx, event._id);
    return toPublicEventFields(event, registeredCount);
  },
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

export const registerPublic = mutation({
  args: {
    eventId: v.id("events"),
    name: v.string(),
    phone: v.string(),
    email: v.optional(v.string()),
    customResponses: v.optional(v.record(v.string(), v.string())),
  },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, args) => {
    const event = await ctx.db.get("events", args.eventId);
    if (!event) {
      throw new Error("Event not found");
    }

    if (event.status !== "published") {
      throw new Error("Registration is not available for this event");
    }

    if (!event.publicRegistrationEnabled) {
      throw new Error("Public registration is not enabled for this event");
    }

    const registeredCount = await getRegisteredCount(ctx, event._id);
    assertEventOpenForRegistration(event, registeredCount);

    if (args.name.length < 2) {
      throw new Error("Name must be at least 2 characters");
    }

    const normalizedPhone = normalizePhone(args.phone);
    if (!isValidE164(normalizedPhone)) {
      throw new Error("Please enter a valid phone number with country code");
    }

    let invite = await ctx.db
      .query("invites")
      .withIndex("by_event_and_phone", (q) =>
        q.eq("eventId", event._id).eq("phone", normalizedPhone)
      )
      .unique();

    const existingRegistration = invite
      ? await ctx.db
          .query("registrations")
          .withIndex("by_invite", (q) => q.eq("inviteId", invite!._id))
          .unique()
      : null;

    if (existingRegistration?.rsvpStatus === "registered") {
      throw new Error("This phone number is already registered for this event");
    }

    if (!invite) {
      const inviteId = await ctx.db.insert("invites", {
        eventId: event._id,
        phone: normalizedPhone,
        token: generateInviteToken(),
        inviteeName: args.name,
        source: "web",
        deliveryStatus: "pending",
        createdAt: Date.now(),
      });
      invite = (await ctx.db.get("invites", inviteId))!;
    } else if (!invite.inviteeName && args.name) {
      await ctx.db.patch("invites", invite._id, { inviteeName: args.name });
    }

    const attemptCount = invite.registrationAttempts ?? 0;
    if (attemptCount >= 10) {
      throw new Error(
        "Too many registration attempts. Please contact the organizer."
      );
    }
    await ctx.db.patch("invites", invite._id, {
      registrationAttempts: attemptCount + 1,
    });

    let registrationId;
    if (existingRegistration) {
      await ctx.db.patch("registrations", existingRegistration._id, {
        name: args.name,
        email: args.email,
        customResponses: args.customResponses,
        rsvpStatus: "registered",
        attendanceStatus: "unknown",
        registeredAt: Date.now(),
      });
      registrationId = existingRegistration._id;
    } else {
      registrationId = await ctx.db.insert("registrations", {
        eventId: event._id,
        inviteId: invite._id,
        phone: normalizedPhone,
        name: args.name,
        email: args.email,
        customResponses: args.customResponses,
        rsvpStatus: "registered",
        attendanceStatus: "unknown",
        registeredAt: Date.now(),
      });
    }

    try {
      await ctx.scheduler.runAfter(0, internal.twilio.sendRsvpConfirmation, {
        registrationId,
      });
    } catch (err) {
      console.error("Failed to schedule RSVP confirmation:", err);
    }

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
