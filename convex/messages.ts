import { paginationOptsValidator, paginationResultValidator } from "convex/server";
import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { profileAvatar, uploadContentType, verifyFile, viewer } from "./social";

const contact = v.object({ id: v.id("profiles"), name: v.string(), handle: v.string(), avatar: v.union(v.string(), v.null()) });
const attachment = v.object({ uploadId: v.id("uploads"), storageId: v.id("_storage") });
const allowedPhotos = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/heic", "image/heif", "image/avif"];
const allowedVoice = ["audio/mp4", "audio/m4a", "audio/x-m4a", "audio/aac", "audio/webm", "audio/3gpp", "audio/mpeg", "audio/wav", "audio/ogg"];
const lifetime = 24 * 60 * 60 * 1000;

export function findPeer(ctx: QueryCtx, handle: string) {
  return ctx.db.query("profiles").withIndex("by_handle", q => q.eq("handle", handle)).unique();
}
async function publicContact(ctx: QueryCtx, row: Doc<"profiles">) {
  const { _id: id, name, handle } = row;
  const avatar = await profileAvatar(ctx, row);
  return { id, name, handle, avatar };
}
export function pairKey(a: Id<"profiles">, b: Id<"profiles">) {
  return a < b ? a + ":" + b : b + ":" + a;
}
function entry(ctx: QueryCtx, ownerId: Id<"profiles">, peerId: Id<"profiles">) {
  return ctx.db.query("inboxEntries").withIndex("by_ownerId_and_peerId", q => q.eq("ownerId", ownerId).eq("peerId", peerId)).unique();
}

export const peer = query({
  args: { handle: v.string() }, returns: v.union(contact, v.null()),
  handler: async (ctx, { handle }) => {
    const me = await viewer(ctx);
    const other = await findPeer(ctx, handle);
    return other && other._id !== me._id ? publicContact(ctx, other) : null;
  },
});
export const inbox = query({
  args: { paginationOpts: paginationOptsValidator },
  returns: paginationResultValidator(v.object({ peer: contact, text: v.string(), updatedAt: v.number(), unread: v.number() })),
  handler: async (ctx, { paginationOpts }) => {
    const me = await viewer(ctx);
    const result = await ctx.db.query("inboxEntries").withIndex("by_ownerId_and_updatedAt", q => q.eq("ownerId", me._id))
      .order("desc").paginate(paginationOpts);
    const rows = await Promise.all(result.page.map(async row => {
      const person = await ctx.db.get("profiles", row.peerId);
      return person && { peer: await publicContact(ctx, person), text: row.text, updatedAt: row.updatedAt, unread: row.unread };
    }));
    return { ...result, page: rows.filter(row => row !== null) };
  },
});
export const history = query({
  args: { handle: v.string(), paginationOpts: paginationOptsValidator },
  returns: paginationResultValidator(v.object({
    id: v.id("messages"), text: v.string(), mine: v.boolean(), createdAt: v.number(),
    photos: v.array(v.string()), location: v.union(v.string(), v.null()), audio: v.union(v.string(), v.null()),
  })),
  handler: async (ctx, { handle, paginationOpts }) => {
    const me = await viewer(ctx);
    const other = await findPeer(ctx, handle);
    if (!other || other._id === me._id) return { page: [], isDone: true, continueCursor: "" };
    const pair = pairKey(me._id, other._id);
    const result = await ctx.db.query("messages").withIndex("by_pair_and_createdAt", q => q.eq("pair", pair))
      .order("desc").paginate(paginationOpts);
    const page = await Promise.all(result.page.map(async row => {
      const urls = await Promise.all(row.photos.map(id => ctx.storage.getUrl(id)));
      return { id: row._id, text: row.text, mine: row.senderId === me._id, createdAt: row.createdAt,
        photos: urls.filter(url => url !== null), location: row.location ?? null, audio: row.voice ? await ctx.storage.getUrl(row.voice) : null };
    }));
    return { ...result, page };
  },
});

export const beginUpload = mutation({
  args: { contentType: v.string(), size: v.number(), sha256: v.string(), durationMs: v.optional(v.number()) },
  returns: v.object({ uploadId: v.id("uploads"), url: v.string(), uploadContentType: v.string() }),
  handler: async (ctx, { contentType, size, sha256 }) => {
    const me = await viewer(ctx);
    const type = contentType.split(";")[0].trim().toLowerCase();
    if (![...allowedPhotos, ...allowedVoice].includes(type)) throw new ConvexError("Unsupported attachment format.");
    if (!Number.isSafeInteger(size) || size < 1 || size > 25 * 1024 * 1024) throw new ConvexError("Choose a file up to 25 MB.");
    if (!/^[0-9a-f]{64}$/.test(sha256)) throw new ConvexError("Invalid file checksum.");
    const uploadId = await ctx.db.insert("uploads", { purpose: "message", authorId: me._id, contentType: type, size, sha256 });
    await ctx.scheduler.runAfter(lifetime, internal.social.expireUpload, { uploadId });
    return { uploadId, url: await ctx.storage.generateUploadUrl(), uploadContentType: uploadContentType(type, uploadId) };
  },
});
async function consume(ctx: MutationCtx, owner: Id<"profiles">, file: { storageId: Id<"_storage">; uploadId: Id<"uploads"> }, formats: string[]) {
  const intent = await ctx.db.get("uploads", file.uploadId);
  if (!intent || intent.purpose !== "message" || intent.authorId !== owner || Date.now() >= intent._creationTime + lifetime) {
    throw new ConvexError("Invalid or expired message upload.");
  }
  if (!formats.includes(intent.contentType)) throw new ConvexError("Unexpected attachment format.");
  await verifyFile(ctx, file.storageId, intent);
  await ctx.db.delete("uploads", file.uploadId);
  return file.storageId;
}

type MessageContent = Pick<Doc<"messages">, "text" | "photos" | "voice" | "location" | "createdAt" | "clientId">;

export async function writeMessage(ctx: MutationCtx, senderId: Id<"profiles">, recipientId: Id<"profiles">, content: MessageContent) {
  const id = await ctx.db.insert("messages", { ...content, senderId, pair: pairKey(senderId, recipientId) });
  const text = content.text || content.location || (content.voice ? "Voice message" : content.photos.length > 1 ? "Photos" : "Photo");
  for (const [ownerId, peerId] of [[senderId, recipientId], [recipientId, senderId]]) {
    const current = await entry(ctx, ownerId, peerId);
    const update = { latestId: id, text, updatedAt: content.createdAt, unread: ownerId === recipientId ? (current?.unread ?? 0) + 1 : 0 };
    if (current) await ctx.db.patch("inboxEntries", current._id, update);
    else await ctx.db.insert("inboxEntries", { ownerId, peerId, ...update });
  }
  return id;
}
export const send = mutation({
  args: { handle: v.string(), text: v.string(), clientId: v.string(), attachments: v.optional(v.array(attachment)), voice: v.optional(attachment), location: v.optional(v.string()) },
  returns: v.id("messages"),
  handler: async (ctx, { handle, text, clientId, attachments = [], voice, location }) => {
    const me = await viewer(ctx);
    const other = await findPeer(ctx, handle);
    if (!other || other._id === me._id) throw new ConvexError("Choose another person to message.");
    const body = text.trim();
    const place = location?.trim() || undefined;
    if (!clientId || clientId.length > 128) throw new ConvexError("Invalid message identifier.");
    if (!body && !attachments.length && !voice && !place) throw new ConvexError("Write a message or choose an attachment.");
    if (body.length > 4000 || attachments.length > 6 || (place?.length ?? 0) > 120) throw new ConvexError("Use up to 4,000 characters, six photos and a place name up to 120 characters.");
    const sent = await ctx.db.query("messages").withIndex("by_senderId_and_clientId", q => q.eq("senderId", me._id).eq("clientId", clientId)).unique();
    if (sent) {
      if (sent.pair !== pairKey(me._id, other._id)) throw new ConvexError("This message identifier is already in use.");
      return sent._id;
    }
    const photos = [];
    for (const attachment of attachments) photos.push(await consume(ctx, me._id, attachment, allowedPhotos));
    return writeMessage(ctx, me._id, other._id, { clientId, text: body, location: place, photos,
      voice: voice ? await consume(ctx, me._id, voice, allowedVoice) : undefined, createdAt: Date.now() });
  },
});
export const markRead = mutation({
  args: { handle: v.string(), throughId: v.optional(v.id("messages")) }, returns: v.null(),
  handler: async (ctx, { handle, throughId }) => {
    const me = await viewer(ctx);
    const other = await findPeer(ctx, handle);
    const current = other && await entry(ctx, me._id, other._id);
    if (current?.unread && (!throughId || throughId === current.latestId)) await ctx.db.patch("inboxEntries", current._id, { unread: 0 });
    return null;
  },
});
