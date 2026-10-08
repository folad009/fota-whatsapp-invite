import { v } from "convex/values";

export const mediaTypeValidator = v.union(
  v.literal("image"),
  v.literal("carousel"),
  v.literal("video")
);

export const carouselSlideValidator = v.object({
  cloudinaryPublicId: v.string(),
  imageUrl: v.string(),
});
