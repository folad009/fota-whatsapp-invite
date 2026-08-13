import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

const eventStatus = v.union(
  v.literal("draft"),
  v.literal("published"),
  v.literal("completed")
);

const deliveryStatus = v.union(
  v.literal("pending"),
  v.literal("sent"),
  v.literal("delivered"),
  v.literal("failed"),
  v.literal("read")
);

const rsvpStatus = v.union(
  v.literal("pending"),
  v.literal("registered"),
  v.literal("declined")
);

const attendanceStatus = v.union(
  v.literal("unknown"),
  v.literal("confirmed"),
  v.literal("declined"),
  v.literal("checked_in")
);

export const userRole = v.union(v.literal("admin"), v.literal("organizer"));

export default defineSchema({
  ...authTables,

  users: defineTable({
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
    role: v.optional(userRole),
  })
    .index("email", ["email"])
    .index("phone", ["phone"])
    .index("by_role", ["role"]),

  events: defineTable({
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
    status: eventStatus,
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  }).index("by_organizer", ["organizerId"]),

  invites: defineTable({
    eventId: v.id("events"),
    phone: v.string(),
    token: v.string(),
    inviteeName: v.optional(v.string()),
    deliveryStatus: deliveryStatus,
    twilioMessageSid: v.optional(v.string()),
    sentAt: v.optional(v.number()),
    failureReason: v.optional(v.string()),
    registrationAttempts: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_event", ["eventId"])
    .index("by_token", ["token"])
    .index("by_phone", ["phone"])
    .index("by_event_and_phone", ["eventId", "phone"])
    .index("by_twilio_message_sid", ["twilioMessageSid"]),

  registrations: defineTable({
    eventId: v.id("events"),
    inviteId: v.id("invites"),
    phone: v.string(),
    name: v.string(),
    email: v.optional(v.string()),
    customResponses: v.optional(v.record(v.string(), v.string())),
    rsvpStatus: rsvpStatus,
    attendanceStatus: attendanceStatus,
    registeredAt: v.optional(v.number()),
    confirmedAt: v.optional(v.number()),
  })
    .index("by_event", ["eventId"])
    .index("by_invite", ["inviteId"]),

  messageLogs: defineTable({
    inviteId: v.optional(v.id("invites")),
    eventId: v.optional(v.id("events")),
    direction: v.union(v.literal("inbound"), v.literal("outbound")),
    body: v.string(),
    twilioSid: v.optional(v.string()),
    status: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_event", ["eventId"])
    .index("by_twilio_sid", ["twilioSid"]),
});
