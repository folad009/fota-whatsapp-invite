import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

function parseFormBody(body: string): Record<string, string> {
  const params: Record<string, string> = {};
  for (const pair of body.split("&")) {
    const [key, value] = pair.split("=");
    if (key) {
      params[decodeURIComponent(key)] = decodeURIComponent(value ?? "");
    }
  }
  return params;
}

function normalizeWhatsAppPhone(from: string): string {
  const phone = from.replace(/^whatsapp:/, "");
  return phone.startsWith("+") ? phone : `+${phone}`;
}

function parseReplyIntent(body: string): {
  rsvpStatus?: "declined";
  attendanceStatus?: "confirmed" | "declined";
} {
  const text = body.trim().toUpperCase();

  if (
    ["YES", "Y", "COMING", "CONFIRM", "CONFIRMED", "I'LL BE THERE"].includes(
      text
    )
  ) {
    return { attendanceStatus: "confirmed" };
  }

  if (
    ["NO", "N", "CANT", "CAN'T", "DECLINE", "DECLINED", "WON'T"].includes(
      text
    ) ||
    text.includes("CAN'T MAKE")
  ) {
    return { attendanceStatus: "declined", rsvpStatus: "declined" };
  }

  if (text === "DECLINE") {
    return { rsvpStatus: "declined", attendanceStatus: "declined" };
  }

  return {};
}

export const handleWebhook = httpAction(async (ctx, request) => {
  const body = await request.text();
  const params = parseFormBody(body);
  const signature = request.headers.get("X-Twilio-Signature") ?? "";

  const webhookUrl = process.env.CONVEX_SITE_URL
    ? `${process.env.CONVEX_SITE_URL}/twilio/webhook`
    : request.url;

  const isValid = await ctx.runAction(internal.twilio.validateTwilioSignature, {
    signature,
    url: webhookUrl,
    params,
  });

  if (!isValid && process.env.TWILIO_AUTH_TOKEN) {
    return new Response("Forbidden", { status: 403 });
  }

  const messageSid = params.MessageSid ?? params.SmsSid;
  const messageStatus = params.MessageStatus;
  const from = params.From;
  const messageBody = params.Body ?? "";

  // Delivery status callback
  if (messageStatus && messageSid) {
    await ctx.runMutation(internal.messageLogs.handleTwilioStatusCallback, {
      twilioSid: messageSid,
      messageStatus,
      errorCode: params.ErrorCode,
      errorMessage: params.ErrorMessage,
    });

    return new Response("<Response></Response>", {
      headers: { "Content-Type": "text/xml" },
    });
  }

  // Inbound message
  if (from && messageBody) {
    if (messageSid) {
      const existing = await ctx.runQuery(internal.messageLogs.getMessageBySid, {
        twilioSid: messageSid,
      });
      if (existing) {
        return new Response("<Response></Response>", {
          headers: { "Content-Type": "text/xml" },
        });
      }
    }

    const phone = normalizeWhatsAppPhone(from);
    const intent = parseReplyIntent(messageBody);

    await ctx.runMutation(internal.messageLogs.logMessage, {
      direction: "inbound",
      body: messageBody,
      twilioSid: messageSid,
    });

    if (intent.rsvpStatus || intent.attendanceStatus) {
      await ctx.runMutation(internal.messageLogs.updateRegistrationFromReply, {
        phone,
        rsvpStatus: intent.rsvpStatus,
        attendanceStatus: intent.attendanceStatus,
      });
    }
  }

  return new Response("<Response></Response>", {
    headers: { "Content-Type": "text/xml" },
  });
});
