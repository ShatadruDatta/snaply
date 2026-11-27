import { Presence } from "@convex-dev/presence";
import { ConvexError, v } from "convex/values";
import { components } from "./_generated/api";
import { mutation, query } from "./_generated/server";
import { findPeer, pairKey } from "./messages";
import { viewer } from "./social";

const presence = new Presence(components.presence);
const channel = v.union(v.literal("online"), v.literal("typing"));

export const heartbeat = mutation({
  args: { handle: v.string(), session: v.string(), channel }, returns: v.string(),
  handler: async (ctx, { handle, session, channel }) => {
    const me = await viewer(ctx);
    const other = await findPeer(ctx, handle);
    if (!other || other._id === me._id) throw new ConvexError("Conversation unavailable.");
    if (!session || session.length > 64) throw new ConvexError("Invalid presence session.");
    const room = pairKey(me._id, other._id) + ":" + channel;
    const sessionId = room + ":" + me._id + ":" + session;
    const { sessionToken } = await presence.heartbeat(ctx, room, me._id, sessionId, channel === "online" ? 10000 : 1600);
    return sessionToken;
  },
});

export const status = query({
  args: { handle: v.string() }, returns: v.object({ online: v.boolean(), typing: v.boolean() }),
  handler: async (ctx, { handle }) => {
    const me = await viewer(ctx);
    const other = await findPeer(ctx, handle);
    if (!other || other._id === me._id) return { online: false, typing: false };
    const pair = pairKey(me._id, other._id);
    const [onlineUsers, typingUsers] = await Promise.all([
      presence.listRoom(ctx, pair + ":online", true, 2),
      presence.listRoom(ctx, pair + ":typing", true, 2),
    ]);
    const online = onlineUsers.some(row => row.userId === other._id);
    return { online, typing: online && typingUsers.some(row => row.userId === other._id) };
  },
});

export const disconnect = mutation({
  args: { sessionToken: v.string() }, returns: v.null(),
  handler: async (ctx, { sessionToken }) => {
    await viewer(ctx);
    // Only the client that opened this session receives its random capability token.
    return presence.disconnect(ctx, sessionToken);
  },
});
