import { v } from "convex/values";
import { authedMutation, authedQuery } from "./lib/auth";

export const getMe = authedQuery({
  args: {},
  returns: v.object({
    _id: v.id("users"),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
  }),
  handler: async (ctx) => {
    return {
      _id: ctx.user._id,
      name: ctx.user.name,
      email: ctx.user.email,
    };
  },
});

export const updateProfile = authedMutation({
  args: {
    name: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    if (args.name.length < 2) {
      throw new Error("Name must be at least 2 characters");
    }
    await ctx.db.patch("users", ctx.user._id, { name: args.name });
    return null;
  },
});
