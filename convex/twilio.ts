"use node";

import { v } from "convex/values";
import Twilio from "twilio";
import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";

function getTwilioClient() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!accountSid || !authToken) {
    throw new Error("Twilio credentials not configured");
  }
  return Twilio(accountSid, authToken);
}

function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

function formatEventDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * Twilio media URL uses Cloudinary transform + {{1}}.jpg — pass public_id path
 * (e.g. event-banners/abc123), no transform prefix, version, or file extension.
 */
function stripCloudinaryDeliveryPath(uploadPath: string): string {
  let path = uploadPath;
  while (/^v\d+\//.test(path) || /^c_[^/]+\//.test(path)) {
    path = path.replace(/^v\d+\//, "").replace(/^c_[^/]+\//, "");
  }
  return path.replace(/\.(jpe?g|png|webp)$/i, "");
}

function getWhatsAppMediaVariable(
  cloudinaryPublicId: string,
  imageUrl?: string
): string {
  if (cloudinaryPublicId.trim()) {
    return cloudinaryPublicId.replace(/\.(jpe?g|png|webp)$/i, "");
  }

  if (imageUrl) {
    const match = imageUrl.match(/\/upload\/(.+?)(?:\?|$)/);
    if (match?.[1]) {
      return stripCloudinaryDeliveryPath(match[1]);
    }
  }

  throw new Error("Missing Cloudinary public_id for WhatsApp media variable");
}

function isDevDeployment(): boolean {
  const appUrl = getAppUrl();
  return appUrl.includes("localhost") || appUrl.includes("127.0.0.1");
}

/**
 * Twilio error 21656: body variables must not contain newlines, tabs, or 4+
 * consecutive spaces. Applies to all content template variables before send.
 */
function sanitizeTwilioContentVariable(value: string): string {
  return value
    .replace(/[\r\n\t]+/g, " ")
    .replace(/ {2,}/g, " ")
    .trim();
}

function sanitizeTwilioContentVariables(
  variables: Record<string, string>
): Record<string, string> {
  const sanitized: Record<string, string> = {};

  for (const [key, value] of Object.entries(variables)) {
    const cleaned = sanitizeTwilioContentVariable(value);
    if (!cleaned) {
      throw new Error(
        `Twilio content variable "${key}" is empty after sanitization`
      );
    }
    sanitized[key] = cleaned;
  }

  return sanitized;
}

function formatEventDescription(description?: string): string {
  if (!description?.trim()) {
    return "No additional details provided.";
  }
  const sanitized = sanitizeTwilioContentVariable(description);
  if (sanitized.length > 500) {
    return `${sanitized.slice(0, 497)}...`;
  }
  return sanitized;
}

async function sendWhatsAppMessage(params: {
  to: string;
  contentSid?: string;
  contentVariables?: Record<string, string>;
  body?: string;
}): Promise<{ sid: string; status: string }> {
  const client = getTwilioClient();
  const from = process.env.TWILIO_WHATSAPP_FROM;
  if (!from) {
    throw new Error("TWILIO_WHATSAPP_FROM not configured");
  }

  const messageParams: {
    from: string;
    to: string;
    contentSid?: string;
    contentVariables?: string;
    body?: string;
  } = {
    from,
    to: `whatsapp:${params.to.replace(/^whatsapp:/, "")}`,
  };

  if (params.contentSid && params.contentVariables) {
    messageParams.contentSid = params.contentSid;
    messageParams.contentVariables = JSON.stringify(
      sanitizeTwilioContentVariables(params.contentVariables)
    );
  } else if (params.body) {
    messageParams.body = params.body;
  } else {
    throw new Error("Either contentSid or body is required");
  }

  const message = await client.messages.create(messageParams);
  return { sid: message.sid, status: message.status };
}

function isMissingContentTemplateError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /content was not found|20404|not found/i.test(message);
}

async function trySendWhatsAppMessage(
  params: Parameters<typeof sendWhatsAppMessage>[0]
): Promise<{ sid: string; status: string } | null> {
  try {
    return await sendWhatsAppMessage(params);
  } catch (error) {
    if (isMissingContentTemplateError(error)) {
      return null;
    }
    throw error;
  }
}

export const sendInvite = internalAction({
  args: { inviteId: v.id("invites") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const data = await ctx.runQuery(internal.twilioHelpers.getInviteData, {
      inviteId: args.inviteId,
    });

    if (!data) {
      return null;
    }

    const { invite, event } = data;
    const registerUrl = `${getAppUrl().replace(/\/$/, "")}/r/${invite.token}`;
    const inviteeName = invite.inviteeName ?? "there";
    const eventDate = formatEventDate(event.date);
    const eventDescription = formatEventDescription(event.description);
    // Twilio button templates use a fixed URL like …/r/{{6}} — pass token only, not full URL.
    const registerPath = invite.token;

    try {
      let result;

      if (event.imageUrl && event.cloudinaryPublicId) {
        const contentSid = process.env.TWILIO_CONTENT_EVENT_INVITE;
        if (contentSid) {
          const contentVariables = {
            "1": getWhatsAppMediaVariable(
              event.cloudinaryPublicId,
              event.imageUrl
            ),
            "2": inviteeName,
            "3": event.title,
            "4": eventDate,
            "5": event.location,
            "6": registerPath,
            "7": eventDescription,
          };

          if (isDevDeployment()) {
            console.log("sendInvite contentVariables", {
              inviteId: args.inviteId,
              eventId: event._id,
              hasDescription: Boolean(event.description?.trim()),
              "7": contentVariables["7"],
              "1": contentVariables["1"],
            });
          }

          result = await trySendWhatsAppMessage({
            to: invite.phone,
            contentSid,
            contentVariables,
          });
        }
      }

      if (!result) {
        const fallbackSid = process.env.TWILIO_CONTENT_TEXT_FALLBACK;
        if (fallbackSid) {
          result = await trySendWhatsAppMessage({
            to: invite.phone,
            contentSid: fallbackSid,
            contentVariables: {
              "1": inviteeName,
              "2": event.title,
              "3": eventDate,
              "4": event.location,
              "5": registerUrl,
            },
          });
        }
      }

      if (!result) {
        result = await sendWhatsAppMessage({
          to: invite.phone,
          body: `Hi ${inviteeName}, you're invited to *${event.title}*!\n\n${eventDescription}\n\nDate: ${eventDate}\nLocation: ${event.location}\n\nRegister: ${registerUrl}\n\nReply DECLINE if you can't attend.`,
        });
      }

      await ctx.runMutation(internal.messageLogs.updateInviteDelivery, {
        inviteId: args.inviteId,
        deliveryStatus: "sent",
        twilioMessageSid: result.sid,
      });

      await ctx.runMutation(internal.messageLogs.logMessage, {
        inviteId: args.inviteId,
        eventId: event._id,
        direction: "outbound",
        body: `Invite sent for ${event.title}`,
        twilioSid: result.sid,
        status: result.status,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown Twilio error";
      await ctx.runMutation(internal.messageLogs.updateInviteDelivery, {
        inviteId: args.inviteId,
        deliveryStatus: "failed",
        failureReason: message,
      });
    }

    return null;
  },
});

export const sendRsvpConfirmation = internalAction({
  args: { registrationId: v.id("registrations") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const data = await ctx.runQuery(
      internal.twilioHelpers.getRegistrationData,
      { registrationId: args.registrationId }
    );

    if (!data) return null;

    const { registration, event } = data;
    const eventDate = formatEventDate(event.date);

    try {
      const contentSid = process.env.TWILIO_CONTENT_RSVP_CONFIRM;
      let result;

      if (contentSid) {
        result = await sendWhatsAppMessage({
          to: registration.phone,
          contentSid,
          contentVariables: {
            "1": registration.name,
            "2": event.title,
            "3": eventDate,
          },
        });
      } else {
        result = await sendWhatsAppMessage({
          to: registration.phone,
          body: `Thanks ${registration.name}! You're registered for ${event.title} on ${eventDate}. See you there!`,
        });
      }

      await ctx.runMutation(internal.messageLogs.logMessage, {
        inviteId: registration.inviteId,
        eventId: event._id,
        direction: "outbound",
        body: `RSVP confirmation for ${registration.name}`,
        twilioSid: result.sid,
        status: result.status,
      });
    } catch (error) {
      console.error("Failed to send RSVP confirmation:", error);
    }

    return null;
  },
});

export const sendReminder = internalAction({
  args: { registrationId: v.id("registrations") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const data = await ctx.runQuery(
      internal.twilioHelpers.getRegistrationData,
      { registrationId: args.registrationId }
    );

    if (!data) return null;

    const { registration, event } = data;
    const eventDate = formatEventDate(event.date);

    try {
      const contentSid = process.env.TWILIO_CONTENT_REMINDER;
      let result;

      if (contentSid) {
        result = await sendWhatsAppMessage({
          to: registration.phone,
          contentSid,
          contentVariables: {
            "1": event.title,
            "2": eventDate,
          },
        });
      } else {
        result = await sendWhatsAppMessage({
          to: registration.phone,
          body: `Reminder: ${event.title} is coming up on ${eventDate}. Reply YES to confirm attendance or NO if you can't make it.`,
        });
      }

      await ctx.runMutation(internal.messageLogs.logMessage, {
        inviteId: registration.inviteId,
        eventId: event._id,
        direction: "outbound",
        body: `Reminder sent to ${registration.name}`,
        twilioSid: result.sid,
        status: result.status,
      });
    } catch (error) {
      console.error("Failed to send reminder:", error);
    }

    return null;
  },
});

export const validateTwilioSignature = internalAction({
  args: {
    signature: v.string(),
    url: v.string(),
    params: v.record(v.string(), v.string()),
  },
  returns: v.boolean(),
  handler: async (_ctx, args) => {
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    if (!authToken) return false;

    return Twilio.validateRequest(
      authToken,
      args.signature,
      args.url,
      args.params
    );
  },
});
