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
    messageParams.contentVariables = JSON.stringify(params.contentVariables);
  } else if (params.body) {
    messageParams.body = params.body;
  } else {
    throw new Error("Either contentSid or body is required");
  }

  const message = await client.messages.create(messageParams);
  return { sid: message.sid, status: message.status };
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
    // Twilio button templates use a fixed URL like …/r/{{6}} — pass token only, not full URL.
    const registerPath = invite.token;

    try {
      let result;

      if (event.imageUrl && event.cloudinaryPublicId) {
        const contentSid = process.env.TWILIO_CONTENT_EVENT_INVITE;
        if (contentSid) {
          result = await sendWhatsAppMessage({
            to: invite.phone,
            contentSid,
            contentVariables: {
              "1": event.cloudinaryPublicId,
              "2": inviteeName,
              "3": event.title,
              "4": eventDate,
              "5": event.location,
              "6": registerPath,
            },
          });
        }
      }

      if (!result) {
        const fallbackSid = process.env.TWILIO_CONTENT_TEXT_FALLBACK;
        if (fallbackSid) {
          result = await sendWhatsAppMessage({
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
        } else {
          result = await sendWhatsAppMessage({
            to: invite.phone,
            body: `Hi ${inviteeName}, you're invited to *${event.title}*!\n\nDate: ${eventDate}\nLocation: ${event.location}\n\nRegister: ${registerUrl}\n\nReply DECLINE if you can't attend.`,
          });
        }
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
