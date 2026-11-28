import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const mediaType = v.union(v.literal("image"), v.literal("video"));

export default defineSchema({
  demoSeedRuns: defineTable({
    name: v.string(), applied: v.boolean(), media: v.record(v.string(), v.id("_storage")),
  }).index("by_name", ["name"]),
  profiles: defineTable({
    tokenIdentifier: v.string(),
    clerkUserId: v.string(),
    handle: v.string(),
    name: v.string(),
    avatarStorageId: v.optional(v.id("_storage")),
    avatar: v.union(v.null(), v.string()),
    followers: v.number(),
    followingCount: v.number(),
    posts: v.number(),
  }).index("by_tokenIdentifier", ["tokenIdentifier"]).index("by_handle", ["handle"]),
  posts: defineTable({
    authorId: v.id("profiles"),
    storageId: v.id("_storage"),
    uploadId: v.id("uploads"),
    mediaType,
    durationMs: v.optional(v.number()),
    caption: v.string(),
    likes: v.number(),
    comments: v.number(),
  }).index("by_authorId", ["authorId"]).index("by_likes", ["likes"])
    .index("by_storageId", ["storageId"]).index("by_uploadId", ["uploadId"]),
  messages: defineTable({
    pair: v.string(), senderId: v.id("profiles"), clientId: v.string(),
    text: v.string(), photos: v.array(v.id("_storage")), voice: v.optional(v.id("_storage")),
    location: v.optional(v.string()), createdAt: v.number(),
  }).index("by_pair_and_createdAt", ["pair", "createdAt"])
    .index("by_senderId_and_clientId", ["senderId", "clientId"]),
  inboxEntries: defineTable({
    ownerId: v.id("profiles"), peerId: v.id("profiles"), updatedAt: v.number(),
    text: v.string(), unread: v.number(), latestId: v.id("messages"),
  }).index("by_ownerId_and_updatedAt", ["ownerId", "updatedAt"])
    .index("by_ownerId_and_peerId", ["ownerId", "peerId"]),
  uploads: defineTable({
    purpose: v.optional(v.literal("message")),
    authorId: v.id("profiles"),
    sha256: v.string(),
    contentType: v.string(),
    size: v.number(),
    durationMs: v.optional(v.number()),
  }),
  likes: defineTable({ postId: v.id("posts"), userId: v.id("profiles") })
    .index("by_postId_and_userId", ["postId", "userId"]),
  commentLikes: defineTable({ commentId: v.id("comments"), userId: v.id("profiles") })
    .index("by_commentId_and_userId", ["commentId", "userId"]),
  comments: defineTable({ postId: v.id("posts"), authorId: v.id("profiles"), text: v.string(), likes: v.optional(v.number()) })
    .index("by_postId", ["postId"]),
  follows: defineTable({ followerId: v.id("profiles"), followeeId: v.id("profiles") })
    .index("by_followerId_and_followeeId", ["followerId", "followeeId"]),
});
