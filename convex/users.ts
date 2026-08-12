import {
  createAccount,
  getAuthUserId,
  invalidateSessions,
  modifyAccountCredentials,
} from "@convex-dev/auth/server";
import { v } from "convex/values";
import { internalQuery, action, mutation } from "./_generated/server";
import { internal } from "./_generated/api";
import {
  adminMutation,
  adminQuery,
  authedMutation,
  authedQuery,
  getCurrentUser,
  resolveUserRole,
} from "./lib/auth";
import { userRole } from "./schema";
import { Id } from "./_generated/dataModel";
import { MutationCtx } from "./_generated/server";

const userRecordValidator = v.object({
  _id: v.id("users"),
  _creationTime: v.number(),
  name: v.optional(v.string()),
  email: v.optional(v.string()),
  role: userRole,
});

async function deleteUserAuthData(ctx: MutationCtx, userId: Id<"users">) {
  const sessions = await ctx.db
    .query("authSessions")
    .withIndex("userId", (q) => q.eq("userId", userId))
    .collect();
  for (const session of sessions) {
    const refreshTokens = await ctx.db
      .query("authRefreshTokens")
      .withIndex("sessionId", (q) => q.eq("sessionId", session._id))
      .collect();
    for (const token of refreshTokens) {
      await ctx.db.delete("authRefreshTokens", token._id);
    }
    await ctx.db.delete("authSessions", session._id);
  }

  const accounts = await ctx.db
    .query("authAccounts")
    .withIndex("userIdAndProvider", (q) => q.eq("userId", userId))
    .collect();
  for (const account of accounts) {
    await ctx.db.delete("authAccounts", account._id);
  }

  await ctx.db.delete("users", userId);
}

export const getMe = authedQuery({
  args: {},
  returns: v.object({
    _id: v.id("users"),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    role: userRole,
  }),
  handler: async (ctx) => {
    return {
      _id: ctx.user._id,
      name: ctx.user.name,
      email: ctx.user.email,
      role: resolveUserRole(ctx.user),
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

export const list = adminQuery({
  args: {},
  returns: v.array(userRecordValidator),
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    return users.map((user) => ({
      _id: user._id,
      _creationTime: user._creationTime,
      name: user.name,
      email: user.email,
      role: resolveUserRole(user),
    }));
  },
});

export const update = adminMutation({
  args: {
    userId: v.id("users"),
    name: v.string(),
    email: v.string(),
    role: userRole,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await ctx.db.get("users", args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    const email = args.email.trim().toLowerCase();
    if (!email.includes("@")) {
      throw new Error("Invalid email address");
    }
    if (args.name.trim().length < 2) {
      throw new Error("Name must be at least 2 characters");
    }

    const existingWithEmail = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", email))
      .unique();
    if (existingWithEmail && existingWithEmail._id !== args.userId) {
      throw new Error("Email already in use");
    }

    await ctx.db.patch("users", args.userId, {
      name: args.name.trim(),
      email,
      role: args.role,
    });

    const account = await ctx.db
      .query("authAccounts")
      .withIndex("userIdAndProvider", (q) =>
        q.eq("userId", args.userId).eq("provider", "password")
      )
      .unique();
    if (account && account.providerAccountId !== email) {
      await ctx.db.patch("authAccounts", account._id, {
        providerAccountId: email,
      });
    }

    return null;
  },
});

export const remove = adminMutation({
  args: {
    userId: v.id("users"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUser(ctx);
    if (args.userId === currentUser._id) {
      throw new Error("You cannot delete your own account");
    }

    const user = await ctx.db.get("users", args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    await deleteUserAuthData(ctx, args.userId);
    return null;
  },
});

export const create = action({
  args: {
    name: v.string(),
    email: v.string(),
    password: v.string(),
    role: userRole,
  },
  returns: v.id("users"),
  handler: async (ctx, args) => {
    await ctx.runQuery(internal.users.assertAdminInternal, {});

    const email = args.email.trim().toLowerCase();
    if (!email.includes("@")) {
      throw new Error("Invalid email address");
    }
    if (args.name.trim().length < 2) {
      throw new Error("Name must be at least 2 characters");
    }
    if (args.password.length < 8) {
      throw new Error("Password must be at least 8 characters");
    }

    const { user } = await createAccount(ctx, {
      provider: "password",
      account: { id: email, secret: args.password },
      profile: {
        email,
        name: args.name.trim(),
        role: args.role,
      },
    });

    return user._id;
  },
});

export const resetPassword = action({
  args: {
    userId: v.id("users"),
    password: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.runQuery(internal.users.assertAdminInternal, {});

    if (args.password.length < 8) {
      throw new Error("Password must be at least 8 characters");
    }

    const user = await ctx.runQuery(internal.users.getUserEmail, {
      userId: args.userId,
    });
    if (!user?.email) {
      throw new Error("User not found");
    }

    await modifyAccountCredentials(ctx, {
      provider: "password",
      account: { id: user.email, secret: args.password },
    });

    await invalidateSessions(ctx, { userId: args.userId });

    return null;
  },
});

export const assertAdminInternal = internalQuery({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db.get("users", userId);
    if (!user || resolveUserRole(user) !== "admin") {
      throw new Error("Admin access required");
    }

    return null;
  },
});

export const getUserEmail = internalQuery({
  args: { userId: v.id("users") },
  returns: v.union(v.object({ email: v.string() }), v.null()),
  handler: async (ctx, args) => {
    const user = await ctx.db.get("users", args.userId);
    if (!user?.email) {
      return null;
    }
    return { email: user.email };
  },
});

/** First-time setup when no users exist: `npx convex run users:createInitialAdmin '{"name":"Admin","email":"you@example.com","password":"..."}'` */
export const createInitialAdmin = action({
  args: {
    name: v.string(),
    email: v.string(),
    password: v.string(),
  },
  returns: v.id("users"),
  handler: async (ctx, args) => {
    const count = await ctx.runQuery(internal.users.countUsers, {});
    if (count > 0) {
      throw new Error("Users already exist. Use the admin dashboard or bootstrapAdmin.");
    }

    const email = args.email.trim().toLowerCase();
    if (args.password.length < 8) {
      throw new Error("Password must be at least 8 characters");
    }

    const { user } = await createAccount(ctx, {
      provider: "password",
      account: { id: email, secret: args.password },
      profile: {
        email,
        name: args.name.trim(),
        role: "admin",
      },
    });

    return user._id;
  },
});

export const countUsers = internalQuery({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    return users.length;
  },
});

async function assertBootstrapAllowed(ctx: MutationCtx, secret?: string) {
  const admins = await ctx.db
    .query("users")
    .withIndex("by_role", (q) => q.eq("role", "admin"))
    .collect();

  if (admins.length === 0) {
    return;
  }

  const bootstrapSecret = process.env.ADMIN_BOOTSTRAP_SECRET;
  if (!bootstrapSecret) {
    throw new Error(
      "An admin already exists. Use the Users dashboard or set ADMIN_BOOTSTRAP_SECRET on Convex."
    );
  }
  if (secret !== bootstrapSecret) {
    throw new Error("Invalid bootstrap secret");
  }
}

/** Promote an existing user to admin: `npx convex run users:bootstrapAdmin '{"email":"..."}'` */
export const bootstrapAdmin = mutation({
  args: {
    email: v.string(),
    secret: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await assertBootstrapAllowed(ctx, args.secret);

    const email = args.email.trim().toLowerCase();
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", email))
      .unique();
    if (!user) {
      throw new Error(`No user found with email ${email}`);
    }
    await ctx.db.patch("users", user._id, { role: "admin" });
    return null;
  },
});
