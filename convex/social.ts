import { paginationOptsValidator, paginationResultValidator } from "convex/server";
import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { internalMutation, mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { mediaType } from "./schema";

const person = v.object({
  id: v.id("profiles"), name: v.string(), handle: v.string(), avatar: v.union(v.string(), v.null()),
  followers: v.number(), followingCount: v.number(), posts: v.number(), following: v.boolean(), isMe: v.boolean(),
});
const post = v.object({
  id: v.id("posts"), author: person, url: v.string(), mediaType, caption: v.string(),
  createdAt: v.number(), likes: v.number(), comments: v.number(), liked: v.boolean(),
});
const comment = v.object({
  id: v.id("comments"), author: person, text: v.string(), createdAt: v.number(), likes: v.number(), liked: v.boolean(),
});
const uploadDetails = { sha256: v.string(), contentType: v.string(), size: v.number(), durationMs: v.optional(v.number()) };
const uploadRetentionMs = 24 * 60 * 60 * 1000;
const maxBytes = 100 * 1024 * 1024;
const supportedMedia = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/heic", "image/heif", "image/avif",
  "video/mp4", "video/quicktime", "video/webm", "video/3gpp", "video/x-m4v"]);

export function uploadContentType(contentType: string, uploadId: Id<"uploads">) {
  return contentType + "; snaply-upload=" + uploadId;
}

function hexDigest(digest: string) {
  if (/^[0-9a-f]{64}$/.test(digest)) return digest;
  return Array.from(atob(digest), byte => byte.charCodeAt(0).toString(16).padStart(2, "0")).join("");
}

async function identity(ctx: QueryCtx) {
  const id = await ctx.auth.getUserIdentity();
  if (!id) throw new ConvexError("Sign in to use Snaply.");
  return id;
}

function profileForToken(ctx: QueryCtx, token: string) {
  return ctx.db.query("profiles").withIndex("by_tokenIdentifier", q => q.eq("tokenIdentifier", token)).unique();
}

export async function viewer(ctx: QueryCtx) {
  const profile = await profileForToken(ctx, (await identity(ctx)).tokenIdentifier);
  if (!profile) throw new ConvexError("Your profile is still being set up. Please try again.");
  return profile;
}

function follow(ctx: QueryCtx, followerId: Id<"profiles">, followeeId: Id<"profiles">) {
  return ctx.db.query("follows").withIndex("by_followerId_and_followeeId", q =>
    q.eq("followerId", followerId).eq("followeeId", followeeId)).unique();
}
function like(ctx: QueryCtx, postId: Id<"posts">, userId: Id<"profiles">) {
  return ctx.db.query("likes").withIndex("by_postId_and_userId", q => q.eq("postId", postId).eq("userId", userId)).unique();
}
async function personView(ctx: QueryCtx, row: Doc<"profiles">, viewerId: Id<"profiles">) {
  const { name, handle, avatar, followers, followingCount, posts } = row;
  const isMe = row._id === viewerId;
  return { id: row._id, name, handle, avatar, followers, followingCount, posts, isMe,
    following: !isMe && !!await follow(ctx, viewerId, row._id) };
}
async function postView(ctx: QueryCtx, row: Doc<"posts">, viewerId: Id<"profiles">) {
  const [author, url, liked] = await Promise.all([
    ctx.db.get("profiles", row.authorId), ctx.storage.getUrl(row.storageId), like(ctx, row._id, viewerId),
  ]);
  if (!author || !url) return null;
  const { caption, likes, comments, mediaType } = row;
  return { id: row._id, createdAt: row._creationTime, author: await personView(ctx, author, viewerId),
    url, caption, likes, comments, mediaType, liked: !!liked };
}
async function existingPost(ctx: QueryCtx, postId: Id<"posts">) {
  const row = await ctx.db.get("posts", postId);
  if (!row) throw new ConvexError("This post has been deleted.");
  return row;
}

export const ensureProfile = mutation({
  args: { displayName: v.optional(v.string()), preferredHandle: v.optional(v.string()) }, returns: v.id("profiles"),
  handler: async (ctx, { displayName, preferredHandle }) => {
    const user = await identity(ctx);
    const existing = await profileForToken(ctx, user.tokenIdentifier);
    if (existing) return existing._id;
    const name = (user.name || displayName?.trim() || user.nickname || user.givenName || "Snaply user").slice(0, 80);
    const base = (user.preferredUsername || preferredHandle?.trim() || name).toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 24) || "snaply";
    let handle = base;
    let suffix = 1;
    while (await ctx.db.query("profiles").withIndex("by_handle", q => q.eq("handle", handle)).unique()) {
      suffix++;
      handle = base.slice(0, 30 - String(suffix).length) + suffix;
    }
    return ctx.db.insert("profiles", { tokenIdentifier: user.tokenIdentifier, clerkUserId: user.subject,
      name, handle, avatar: user.pictureUrl || null, followers: 0, followingCount: 0, posts: 0 });
  },
});
export const me = query({
  args: {}, returns: v.union(person, v.null()),
  handler: async ctx => {
    const row = await profileForToken(ctx, (await identity(ctx)).tokenIdentifier);
    return row ? personView(ctx, row, row._id) : null;
  },
});
export const people = query({
  args: { paginationOpts: paginationOptsValidator }, returns: paginationResultValidator(person),
  handler: async (ctx, { paginationOpts }) => {
    const user = await viewer(ctx);
    const page = await ctx.db.query("profiles").withIndex("by_handle").paginate(paginationOpts);
    return { ...page, page: await Promise.all(page.page.filter(row => row._id !== user._id).map(row => personView(ctx, row, user._id))) };
  },
});
export const feed = query({
  args: { scope: v.union(v.literal("recent"), v.literal("following"), v.literal("mine"), v.literal("trending")), paginationOpts: paginationOptsValidator },
  returns: paginationResultValidator(post),
  handler: async (ctx, { scope, paginationOpts }) => {
    const user = await viewer(ctx);
    const all = ctx.db.query("posts");
    const indexed = scope === "mine" ? all.withIndex("by_authorId", q => q.eq("authorId", user._id)) :
      scope === "trending" ? all.withIndex("by_likes") : all.withIndex("by_creation_time");
    const page = await indexed.order("desc").paginate(paginationOpts);
    // Filter inside this cursor window so even a sparse follow graph has bounded reads.
    const rows = await Promise.all(page.page.map(async row => {
      if (scope === "following" && !await follow(ctx, user._id, row.authorId)) return null;
      return postView(ctx, row, user._id);
    }));
    return { ...page, page: rows.filter(row => row !== null) };
  },
});
export const getPost = query({
  args: { postId: v.id("posts") }, returns: v.union(post, v.null()),
  handler: async (ctx, { postId }) => {
    const user = await viewer(ctx);
    const row = await ctx.db.get("posts", postId);
    return row ? postView(ctx, row, user._id) : null;
  },
});

export async function verifyFile(ctx: QueryCtx, storageId: Id<"_storage">, intent: Doc<"uploads">) {
  const info = await ctx.db.system.get("_storage", storageId);
  if (!info || info._creationTime < intent._creationTime || hexDigest(info.sha256) !== intent.sha256 ||
    info.size !== intent.size || info.contentType !== uploadContentType(intent.contentType, intent._id)) throw new ConvexError("Uploaded file did not match the selected media.");
}

export const beginUpload = mutation({
  args: uploadDetails, returns: v.object({ uploadId: v.id("uploads"), url: v.string(), uploadContentType: v.string() }),
  handler: async (ctx, args) => {
    const user = await viewer(ctx);
    if (!/^[0-9a-f]{64}$/.test(args.sha256)) throw new ConvexError("Invalid file checksum.");
    if (!Number.isSafeInteger(args.size) || args.size <= 0 || args.size > maxBytes) throw new ConvexError("Choose a file up to 100 MB.");
    if (!supportedMedia.has(args.contentType)) throw new ConvexError("This file format isn’t supported.");
    if (args.contentType.startsWith("video/") && (!args.durationMs || !Number.isFinite(args.durationMs) || args.durationMs <= 0 || args.durationMs > 60_000)) {
      throw new ConvexError("Choose a video up to 60 seconds long.");
    }
    const uploadId = await ctx.db.insert("uploads", { authorId: user._id, ...args });
    await ctx.scheduler.runAfter(uploadRetentionMs, internal.social.expireUpload, { uploadId });
    return { uploadId, url: await ctx.storage.generateUploadUrl(), uploadContentType: uploadContentType(args.contentType, uploadId) };
  },
});
export const expireUpload = internalMutation({
  args: { uploadId: v.id("uploads"), cursor: v.optional(v.string()) }, returns: v.null(),
  handler: async (ctx, { uploadId, cursor }) => {
    const intent = await ctx.db.get("uploads", uploadId);
    if (!intent) return null;
    // A signed URL is valid for one hour, and Convex limits a POST to two minutes.
    // Search only that window, retaining a margin for a late-finishing transfer.
    const page = await ctx.db.system.query("_storage").withIndex("by_creation_time", q =>
      q.gte("_creationTime", intent._creationTime).lte("_creationTime", intent._creationTime + 70 * 60 * 1000)
    ).paginate({ cursor: cursor ?? null, numItems: 64 });
    for (const file of page.page) {
      if (file.contentType !== uploadContentType(intent.contentType, uploadId) || file.size !== intent.size ||
        hexDigest(file.sha256) !== intent.sha256) continue;
      const claimed = await ctx.db.query("posts").withIndex("by_storageId", q => q.eq("storageId", file._id)).unique();
      if (!claimed) await ctx.storage.delete(file._id);
    }
    if (page.isDone) await ctx.db.delete("uploads", uploadId);
    else await ctx.scheduler.runAfter(0, internal.social.expireUpload, { uploadId, cursor: page.continueCursor });
    return null;
  },
});
export const publish = mutation({
  args: { uploadId: v.id("uploads"), storageId: v.id("_storage"), caption: v.string() }, returns: v.id("posts"),
  handler: async (ctx, { uploadId, storageId, caption }) => {
    const user = await viewer(ctx);
    const prior = await ctx.db.query("posts").withIndex("by_uploadId", q => q.eq("uploadId", uploadId)).unique();
    if (prior) {
      if (prior.authorId !== user._id || prior.storageId !== storageId) throw new ConvexError("Invalid upload.");
      return prior._id;
    }
    const intent = await ctx.db.get("uploads", uploadId);
    if (!intent || intent.purpose === "message" || intent.authorId !== user._id || Date.now() >= intent._creationTime + uploadRetentionMs) throw new ConvexError("Your upload expired. Select the file again.");
    if (caption.length > 500) throw new ConvexError("Captions can contain up to 500 characters.");
    await verifyFile(ctx, storageId, intent);
    const claimed = await ctx.db.query("posts").withIndex("by_storageId", q => q.eq("storageId", storageId)).unique();
    if (claimed) throw new ConvexError("This upload was already published.");
    const id = await ctx.db.insert("posts", { authorId: user._id, storageId, uploadId, caption: caption.trim(),
      mediaType: intent.contentType.startsWith("video/") ? "video" : "image",
      durationMs: intent.durationMs, likes: 0, comments: 0 });
    await ctx.db.patch("profiles", user._id, { posts: user.posts + 1 });
    await ctx.db.delete("uploads", uploadId);
    return id;
  },
});

export const setLike = mutation({
  args: { postId: v.id("posts"), liked: v.boolean() }, returns: v.null(),
  handler: async (ctx, { postId, liked }) => {
    const user = await viewer(ctx);
    const row = await existingPost(ctx, postId);
    const prior = await like(ctx, postId, user._id);
    if (liked === !!prior) return null;
    if (prior) await ctx.db.delete("likes", prior._id);
    else await ctx.db.insert("likes", { postId, userId: user._id });
    await ctx.db.patch("posts", postId, { likes: row.likes + (liked ? 1 : -1) });
    return null;
  },
});
export const setFollow = mutation({
  args: { profileId: v.id("profiles"), following: v.boolean() }, returns: v.null(),
  handler: async (ctx, { profileId, following }) => {
    const user = await viewer(ctx);
    if (profileId === user._id) throw new ConvexError("You can’t follow yourself.");
    const other = await ctx.db.get("profiles", profileId);
    if (!other) throw new ConvexError("Profile unavailable.");
    const prior = await follow(ctx, user._id, profileId);
    if (following === !!prior) return null;
    if (prior) await ctx.db.delete("follows", prior._id);
    else await ctx.db.insert("follows", { followerId: user._id, followeeId: profileId });
    const change = following ? 1 : -1;
    await ctx.db.patch("profiles", user._id, { followingCount: user.followingCount + change });
    await ctx.db.patch("profiles", other._id, { followers: other.followers + change });
    return null;
  },
});
function commentLike(ctx: QueryCtx, commentId: Id<"comments">, userId: Id<"profiles">) {
  return ctx.db.query("commentLikes").withIndex("by_commentId_and_userId", q =>
    q.eq("commentId", commentId).eq("userId", userId)).unique();
}

export const setCommentLike = mutation({
  args: { commentId: v.id("comments"), liked: v.boolean() }, returns: v.null(),
  handler: async (ctx, { commentId, liked }) => {
    const user = await viewer(ctx);
    const row = await ctx.db.get("comments", commentId);
    if (!row) throw new ConvexError("This comment has been deleted.");
    await existingPost(ctx, row.postId);
    const prior = await commentLike(ctx, commentId, user._id);
    if (liked === !!prior) return null;
    if (prior) await ctx.db.delete("commentLikes", prior._id);
    else await ctx.db.insert("commentLikes", { commentId, userId: user._id });
    await ctx.db.patch("comments", commentId, { likes: (row.likes ?? 0) + (liked ? 1 : -1) });
    return null;
  },
});

export const comments = query({
  args: { postId: v.id("posts"), order: v.optional(v.union(v.literal("asc"), v.literal("desc"))), paginationOpts: paginationOptsValidator },
  returns: paginationResultValidator(comment),
  handler: async (ctx, { postId, order = "desc", paginationOpts }) => {
    const user = await viewer(ctx);
    const page = await ctx.db.query("comments").withIndex("by_postId", q => q.eq("postId", postId)).order(order).paginate(paginationOpts);
    if (!await ctx.db.get("posts", postId)) return { ...page, page: [] };
    return { ...page, page: await Promise.all(page.page.map(async row => {
      const [author, liked] = await Promise.all([
        ctx.db.get("profiles", row.authorId), commentLike(ctx, row._id, user._id),
      ]);
      if (!author) throw new ConvexError("Comment author unavailable.");
      return { id: row._id, author: await personView(ctx, author, user._id), text: row.text,
        createdAt: row._creationTime, likes: row.likes ?? 0, liked: !!liked };
    })) };
  },
});
export const addComment = mutation({
  args: { postId: v.id("posts"), text: v.string() }, returns: v.id("comments"),
  handler: async (ctx, { postId, text }) => {
    const user = await viewer(ctx);
    const row = await existingPost(ctx, postId);
    const body = text.trim();
    if (!body || body.length > 1000) throw new ConvexError("Write a comment between 1 and 1,000 characters.");
    const id = await ctx.db.insert("comments", { postId, authorId: user._id, text: body });
    await ctx.db.patch("posts", postId, { comments: row.comments + 1 });
    return id;
  },
});
async function removeComment(ctx: MutationCtx, row: Doc<"comments">) {
  await ctx.db.delete("comments", row._id);
  if (row.likes) await ctx.scheduler.runAfter(0, internal.social.cleanupCommentLikes, { commentId: row._id });
}

export const cleanupCommentLikes = internalMutation({
  args: { commentId: v.id("comments") }, returns: v.null(),
  handler: async (ctx, { commentId }) => {
    const batch = await ctx.db.query("commentLikes").withIndex("by_commentId_and_userId", q => q.eq("commentId", commentId)).take(100);
    for (const reaction of batch) await ctx.db.delete("commentLikes", reaction._id);
    if (batch.length === 100) await ctx.scheduler.runAfter(0, internal.social.cleanupCommentLikes, { commentId });
    return null;
  },
});
export const deleteComment = mutation({
  args: { commentId: v.id("comments") }, returns: v.null(),
  handler: async (ctx, { commentId }) => {
    const user = await viewer(ctx);
    const row = await ctx.db.get("comments", commentId);
    if (!row) return null;
    if (row.authorId !== user._id) throw new ConvexError("Only the author can delete this comment.");
    const post = await ctx.db.get("posts", row.postId);
    if (post) await ctx.db.patch("posts", row.postId, { comments: post.comments - 1 });
    await removeComment(ctx, row);
    return null;
  },
});
export const deletePost = mutation({
  args: { postId: v.id("posts") }, returns: v.null(),
  handler: async (ctx, { postId }) => {
    const user = await viewer(ctx);
    const row = await ctx.db.get("posts", postId);
    if (!row) return null;
    if (row.authorId !== user._id) throw new ConvexError("Only the author can delete this post.");
    await ctx.storage.delete(row.storageId);
    await ctx.db.delete("posts", postId);
    await ctx.db.patch("profiles", user._id, { posts: user.posts - 1 });
    await ctx.scheduler.runAfter(0, internal.social.cleanupPost, { postId });
    return null;
  },
});
export const cleanupPost = internalMutation({
  args: { postId: v.id("posts") }, returns: v.null(),
  handler: async (ctx, { postId }) => {
    const likes = await ctx.db.query("likes").withIndex("by_postId_and_userId", q => q.eq("postId", postId)).take(100);
    const comments = await ctx.db.query("comments").withIndex("by_postId", q => q.eq("postId", postId)).take(100);
    for (const row of likes) await ctx.db.delete("likes", row._id);
    for (const row of comments) await removeComment(ctx, row);
    if (likes.length === 100 || comments.length === 100) await ctx.scheduler.runAfter(0, internal.social.cleanupPost, { postId });
    return null;
  },
});
