import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export const sendDailyReminders = internalAction({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const now = Date.now();
    const windowStart = now + ONE_DAY_MS - 60 * 60 * 1000;
    const windowEnd = now + ONE_DAY_MS + 60 * 60 * 1000;

    const eventIds = await ctx.runQuery(
      internal.twilioHelpers.getEventsForReminder,
      { windowStart, windowEnd }
    );

    for (const eventId of eventIds) {
      const registrationIds = await ctx.runQuery(
        internal.twilioHelpers.getRegistrationsForReminder,
        { eventId }
      );

      for (let i = 0; i < registrationIds.length; i++) {
        await ctx.scheduler.runAfter(
          i * 1000,
          internal.twilio.sendReminder,
          { registrationId: registrationIds[i] }
        );
      }
    }

    return null;
  },
});
