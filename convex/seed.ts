import { writeMessage } from "./messages";

import { v } from "convex/values";
import { internalMutation, type MutationCtx, type QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { creators, replies, snapshots } from "./seedFixtures";

const seedName = "social-demo-v1";
const media = [
  ...creators.map(([handle, , portrait]) => ({ key: handle, path: "assets/images/" + portrait + ".jpg" })),
  ...snapshots.map(({ path }, i) => ({ key: "post_" + i, path })),
];
function run(ctx: QueryCtx) {
  return ctx.db.query("demoSeedRuns").withIndex("by_name", q => q.eq("name", seedName)).unique();
}
function taggedType(item: (typeof media)[number]) {
  return (item.path.endsWith(".mp4") ? "video/mp4" : "image/jpeg") + "; snaply-demo=" + seedName + "-" + item.key;
}

// Called only by the development seed runner. Successfully staged batches survive retries.
export const prepare = internalMutation({
  args: {},
  returns: v.array(v.object({ key: v.string(), path: v.string(), contentType: v.string(), url: v.string() })),
  handler: async ctx => {
    const state = await run(ctx);
    if (state?.applied) return [];
    if (!state) await ctx.db.insert("demoSeedRuns", { name: seedName, applied: false, media: {} });
    return Promise.all(media.filter(item => !state?.media[item.key]).map(async item => ({
      ...item, contentType: taggedType(item), url: await ctx.storage.generateUploadUrl(),
    })));
  },
});

export const stage = internalMutation({
  args: { files: v.array(v.object({ key: v.string(), id: v.id("_storage") })) }, returns: v.null(),
  handler: async (ctx, { files }) => {
    const state = await run(ctx);
    if (!state) throw new Error("Prepare the demo seed first.");
    const ids = { ...state.media };
    for (const file of files) {
      const asset = media.find(item => item.key === file.key);
      const info = await ctx.db.system.get("_storage", file.id);
      if (!asset || !info || info.contentType !== taggedType(asset)) throw new Error("Unexpected seed asset.");
      if (ids[file.key] && ids[file.key] !== file.id) await ctx.storage.delete(file.id);
      else ids[file.key] = file.id;
    }
    await ctx.db.patch("demoSeedRuns", state._id, { media: ids });
    return null;
  },
});

async function connect(ctx: MutationCtx, followerId: Id<"profiles">, followeeId: Id<"profiles">) {
  const follower = await ctx.db.get("profiles", followerId);
  const followee = await ctx.db.get("profiles", followeeId);
  if (!follower || !followee || followerId === followeeId) throw new Error("Invalid fixture relationship.");
  await ctx.db.insert("follows", { followerId, followeeId });
  await ctx.db.patch("profiles", followerId, { followingCount: follower.followingCount + 1 });
  await ctx.db.patch("profiles", followeeId, { followers: followee.followers + 1 });
}

export const apply = internalMutation({
  args: { viewerHandle: v.optional(v.string()) }, returns: v.string(),
  handler: async (ctx, { viewerHandle }) => {
    const state = await run(ctx);
    if (state?.applied) return "Already populated.";
    if (!state || media.some(item => !state.media[item.key])) throw new Error("Finish staging the demo media first.");
    const viewer = viewerHandle && await ctx.db.query("profiles").withIndex("by_handle", q => q.eq("handle", viewerHandle)).unique();
    if (viewerHandle && !viewer) throw new Error("Development profile handle was not found.");
    const users: Id<"profiles">[] = [];
    for (const [handle, name] of creators) {
      if (await ctx.db.query("profiles").withIndex("by_handle", q => q.eq("handle", handle)).unique()) {
        throw new Error("Fixture handle already in use: " + handle);
      }
      users.push(await ctx.db.insert("profiles", {
        handle, name, avatar: await ctx.storage.getUrl(state.media[handle]), posts: 0, followers: 0,
        followingCount: 0, tokenIdentifier: "snaply-demo.invalid|" + handle, clerkUserId: "fixture_" + handle,
      }));
    }
    const user = (index: number) => users[index % users.length];
    for (let i = 0; i < users.length; i++) {
      for (const offset of [1, 3, 5, 7]) await connect(ctx, user(i), user(i + offset));
      if (viewer && i % 2 === 0) await connect(ctx, viewer._id, user(i));
      if (viewer && i % 3 === 0) await connect(ctx, user(i), viewer._id);
    }
    const postCounts = users.map(() => 0);
    let commentCount = 0;
    let likeCount = 0;
    let commentLikeCount = 0;
    for (const [i, fixture] of snapshots.entries()) {
      const authorId = user(i);
      const storageId = state.media["post_" + i];
      const metadata = await ctx.db.system.get("_storage", storageId);
      if (!metadata) throw new Error("A staged post asset is missing.");
      // Published posts keep the upload ID after their upload intent is consumed.
      const uploadId = await ctx.db.insert("uploads", {
        authorId, contentType: metadata.contentType!, size: metadata.size, sha256: metadata.sha256,
      });
      const likes = 2 + (i * 7) % 15;
      const comments = i === snapshots.length - 1 ? replies.length : 2 + i % 7;
      const postId = await ctx.db.insert("posts", {
        authorId, storageId, uploadId, caption: fixture.caption, mediaType: fixture.video ? "video" : "image",
        ...(fixture.video ? { durationMs: 4000 } : {}), likes, comments,
      });
      await ctx.db.delete("uploads", uploadId);
      postCounts[i % users.length]++;
      for (let j = 1; j <= likes; j++) await ctx.db.insert("likes", { userId: user(i + j), postId });
      likeCount += likes;
      for (let j = 0; j < comments; j++) {
        const reactionCount = (i + j) % 5;
        const commentId = await ctx.db.insert("comments", {
          authorId: user(i + j + 1), postId, text: replies[(i * 3 + j) % replies.length], likes: reactionCount,
        });
        for (let k = 0; k < reactionCount; k++) {
          await ctx.db.insert("commentLikes", { commentId, userId: user(i + j + k + 2) });
        }
        commentLikeCount += reactionCount;
      }
      commentCount += comments;
    }
    for (const [i, id] of users.entries()) await ctx.db.patch("profiles", id, { posts: postCounts[i] });
    await ctx.db.patch("demoSeedRuns", state._id, { applied: true });
    return `Created ${users.length} profiles, ${snapshots.length} posts, ${commentCount} comments, ${likeCount} post likes and ${commentLikeCount} comment likes.`;
  },
});

const chatPhotos = [{ name: "peak", path: "assets/images/chat/peak.png" }, { name: "flags", path: "assets/images/chat/flags.png" }];
export const prepareChatPhotos = internalMutation({
  args: {},
  returns: v.array(v.object({ name: v.string(), path: v.string(), contentType: v.string(), url: v.string() })),
  handler: async ctx => {
    const assets = await run(ctx);
    if (!assets?.applied) throw new Error("Apply the social seed first.");
    return Promise.all(chatPhotos.filter(photo => !assets.media["chat_" + photo.name]).map(async photo => ({
      ...photo, url: await ctx.storage.generateUploadUrl(), contentType: "image/png; snaply-chat-demo=" + photo.name,
    })));
  },
});

export const messages = internalMutation({
  args: { viewerHandle: v.string(), photos: v.optional(v.array(v.object({ name: v.string(), storageId: v.id("_storage") }))) }, returns: v.number(),
  handler: async (ctx, { viewerHandle, photos = [] }) => {
    const profile = (handle: string) => ctx.db.query("profiles").withIndex("by_handle", q => q.eq("handle", handle)).unique();
    const viewer = await profile(viewerHandle);
    const assets = await run(ctx);
    if (!viewer || !assets?.applied) throw new Error("Seed the social profiles and media first.");
    for (const photo of photos) {
      const info = await ctx.db.system.get("_storage", photo.storageId);
      if (!chatPhotos.some(item => item.name === photo.name) || info?.contentType !== "image/png; snaply-chat-demo=" + photo.name) throw new Error("Unexpected chat fixture.");
      const key = "chat_" + photo.name;
      if (assets.media[key] && assets.media[key] !== photo.storageId) await ctx.storage.delete(photo.storageId);
      else assets.media[key] = photo.storageId;
    }
    if (photos.length) await ctx.db.patch("demoSeedRuns", assets._id, { media: assets.media });
    const collage = [assets.media.chat_peak ?? assets.media.post_13, assets.media.chat_flags ?? assets.media.post_18,
      ...[7, 5, 14, 1].map(i => assets.media["post_" + i])];
    const examples = [
      ["mia_trails", "That sounds great!", 2],
      ["milo_sketches", "Are you planning another trip?", 24],
      ["omar_light", "Let me know the dates.", 60],
      ["nora_fields", "Yes, totally!", 180],
      ["dev_kitchen", "Cool, see you there!", 300],
    ] as const;
    let created = 0;
    for (const [handle, preview, minutesAgo] of examples) {
      const peer = await profile(handle);
      if (!peer || peer._id === viewer._id || peer.tokenIdentifier !== "snaply-demo.invalid|" + handle) {
        throw new Error("Expected a fictional demo contact: " + handle);
      }
      const existing = await ctx.db.query("inboxEntries").withIndex("by_ownerId_and_peerId", q =>
        q.eq("ownerId", viewer._id).eq("peerId", peer._id)).unique();
      if (existing) {
        if (handle === "mia_trails" && photos.length) {
          const row = await ctx.db.query("messages").withIndex("by_senderId_and_clientId", q =>
            q.eq("senderId", viewer._id).eq("clientId", "demo-" + viewer._id + "-2")).unique();
          if (row) await ctx.db.patch("messages", row._id, { photos: collage });
        }
        continue;
      }
      const lastAt = Date.now() - minutesAgo * 60000;
      if (handle === "mia_trails") {
        const travel = [
          { mine: false, text: "Hey! 👋\nHow was your trip to Himalayas?\nThe photos looked amazing! 😍" },
          { mine: true, text: "It was absolutely stunning! 🌄 The views were surreal, totally worth it!" },
          { mine: true, text: "", photos: collage },
          { mine: false, text: "Wow! These are incredible! 😍\nWhich place is this?" },
          { mine: true, text: "You should definitely plan a trip here sometime. It’s perfect for a short getaway! ✨", location: "Triund, Himachal Pradesh" },
        ];
        for (const [i, item] of travel.entries()) {
          await writeMessage(ctx, item.mine ? viewer._id : peer._id, item.mine ? peer._id : viewer._id,
            { clientId: "demo-" + viewer._id + "-" + i, text: item.text, photos: item.photos ?? [], location: item.location, createdAt: lastAt - (5 - i) * 60000 });
        }
      }
      await writeMessage(ctx, peer._id, viewer._id, { clientId: "demo-last-" + viewer._id, text: preview, photos: [], createdAt: lastAt });
      if (handle !== "mia_trails") {
        const row = await ctx.db.query("inboxEntries").withIndex("by_ownerId_and_peerId", q =>
          q.eq("ownerId", viewer._id).eq("peerId", peer._id)).unique();
        if (row) await ctx.db.patch("inboxEntries", row._id, { unread: 0 });
      }
      created++;
    }
    return created;
  },
});
