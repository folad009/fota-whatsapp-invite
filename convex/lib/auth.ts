import { getAuthUserId } from "@convex-dev/auth/server";
import { customMutation, customQuery } from "convex-helpers/server/customFunctions";
import { mutation, query, QueryCtx, MutationCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";

export type UserRole = "admin" | "organizer";

export type AppUser = {
  _id: Id<"users">;
  _creationTime: number;
  name?: string;
  email?: string;
  image?: string;
  role?: UserRole;
};

export function resolveUserRole(user: AppUser): UserRole {
  return user.role ?? "organizer";
}

export function isAdminUser(user: AppUser): boolean {
  return resolveUserRole(user) === "admin";
}

export async function getCurrentUserId(
  ctx: QueryCtx | MutationCtx
): Promise<Id<"users">> {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new Error("Not authenticated");
  }
  return userId as Id<"users">;
}

export async function getCurrentUser(
  ctx: QueryCtx | MutationCtx
): Promise<AppUser> {
  const userId = await getCurrentUserId(ctx);
  const user = await ctx.db.get("users", userId);
  if (!user) {
    throw new Error("User not found");
  }
  return user as AppUser;
}

export async function getCurrentUserOrNull(
  ctx: QueryCtx | MutationCtx
): Promise<AppUser | null> {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    return null;
  }
  const user = await ctx.db.get("users", userId as Id<"users">);
  return user ? (user as AppUser) : null;
}

export async function requireAdmin(
  ctx: QueryCtx | MutationCtx
): Promise<AppUser> {
  const user = await getCurrentUser(ctx);
  if (!isAdminUser(user)) {
    throw new Error("Admin access required");
  }
  return user;
}

export async function requireEventOrganizer(
  ctx: QueryCtx | MutationCtx,
  eventId: Id<"events">
): Promise<{ user: AppUser; event: Record<string, unknown> }> {
  const user = await getCurrentUser(ctx);
  const event = await ctx.db.get("events", eventId);
  if (!event) {
    throw new Error("Event not found");
  }
  const eventRecord = event as unknown as Record<string, unknown> & {
    organizerId: Id<"users">;
  };
  if (eventRecord.organizerId !== user._id) {
    throw new Error("Unauthorized: You don't own this event");
  }
  return { user, event: eventRecord };
}

export const authedQuery = customQuery(query, {
  args: {},
  input: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    return { ctx: { ...ctx, user }, args };
  },
});

export const authedMutation = customMutation(mutation, {
  args: {},
  input: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    return { ctx: { ...ctx, user }, args };
  },
});

export const adminQuery = customQuery(authedQuery, {
  args: {},
  input: async (ctx, args) => {
    await requireAdmin(ctx);
    return { ctx, args };
  },
});

export const adminMutation = customMutation(authedMutation, {
  args: {},
  input: async (ctx, args) => {
    await requireAdmin(ctx);
    return { ctx, args };
  },
});
