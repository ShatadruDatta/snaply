/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob(["./**/*.ts", "./_generated/*.js", "!./**/*.test.ts"]);
const social = api.social;
const paginationOpts = { cursor: null, numItems: 10 };
const photo = new Blob(["photo bytes"], { type: "image/png" });
const checksum = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", await photo.arrayBuffer())),
  byte => byte.toString(16).padStart(2, "0")).join("");
const details = { size: photo.size, contentType: photo.type, sha256: checksum };

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

async function setup() {
  const t = convexTest(schema, modules);
  const owner = t.withIdentity({ subject: "owner", name: "Asha" });
  const reader = t.withIdentity({ subject: "reader", name: "Asha" });
  const ownerId = await owner.mutation(social.ensureProfile, {});
  const readerId = await reader.mutation(social.ensureProfile, {});
  async function upload() {
    const { uploadId, uploadContentType } = await owner.mutation(social.beginUpload, details);
    const storageId = await t.run(ctx => ctx.storage.store(new Blob([photo], { type: uploadContentType })));
    return { uploadId, storageId, caption: " Hills " };
  }
  return { t, owner, reader, ownerId, readerId, upload };
}

test("requires identity and creates distinct discoverable profiles even before posting", async () => {
  const { t, owner, reader, ownerId } = await setup();
  await expect(t.mutation(social.ensureProfile, {})).rejects.toThrow("Sign in");
  await expect(t.query(social.feed, { scope: "recent", paginationOpts })).rejects.toThrow("Sign in");
  expect(await owner.mutation(social.ensureProfile, {})).toEqual(ownerId);
  const people = await reader.query(social.people, { paginationOpts });
  expect(people.page).toHaveLength(1);
  expect(people.page[0]).toMatchObject({ id: ownerId, handle: "asha", posts: 0 });
  expect((await reader.query(social.me))?.handle).toBe("asha2");
});

test("publishes only verified uploads owned by the caller and handles retries", async () => {
  const { t, owner, reader, upload } = await setup();
  const duplicate = await reader.mutation(social.beginUpload, details);
  const args = await upload();
  await expect(reader.mutation(social.publish, args)).rejects.toThrow("upload");
  const badFile = await t.run(ctx => ctx.storage.store(new Blob(["other bytes"], { type: photo.type })));
  await expect(owner.mutation(social.publish, { ...args, storageId: badFile })).rejects.toThrow("did not match");
  await expect(owner.mutation(social.publish, { ...args, caption: "x".repeat(501) })).rejects.toThrow("500");
  const postId = await owner.mutation(social.publish, args);
  expect(await owner.mutation(social.publish, args)).toBe(postId);
  await expect(reader.mutation(social.publish, { ...args, uploadId: duplicate.uploadId })).rejects.toThrow("did not match");
  expect(await reader.query(social.getPost, { postId })).toMatchObject({ caption: "Hills", author: { posts: 1, isMe: false }, mediaType: "image" });
  expect((await owner.query(social.feed, { scope: "mine", paginationOpts })).page).toHaveLength(1);
  expect((await reader.query(social.feed, { scope: "mine", paginationOpts })).page).toHaveLength(0);
});

test("updates an existing post's avatar for both its author and another viewer", async () => {
  const { owner, reader, upload } = await setup();
  const postId = await owner.mutation(social.publish, await upload());
  const { uploadId, storageId } = await upload();
  const file = { uploadId, storageId };
  await expect(reader.mutation(social.setProfilePhoto, file)).rejects.toThrow();
  await owner.mutation(social.setProfilePhoto, file);
  await owner.mutation(social.setProfilePhoto, file);
  const avatar = (await owner.query(social.me))?.avatar;
  expect(avatar).toBeTruthy();
  for (const user of [owner, reader]) {
    expect((await user.query(social.getPost, { postId }))?.author.avatar).toBe(avatar);
    expect((await user.query(social.feed, { scope: "recent", paginationOpts })).page[0].author.avatar).toBe(avatar);
  }
});

test("applies size, media and video duration limits at the upload boundary", async () => {
  const { owner } = await setup();
  const max = 100 * 1024 * 1024;
  const video = { ...details, contentType: "video/mp4", durationMs: 60_000, size: max };
  await expect(owner.mutation(social.beginUpload, video)).resolves.toHaveProperty("url");
  await expect(owner.mutation(social.beginUpload, { ...video, durationMs: 60_001 })).rejects.toThrow("60 seconds");
  await expect(owner.mutation(social.beginUpload, { ...video, size: max + 1 })).rejects.toThrow("100 MB");
  await expect(owner.mutation(social.beginUpload, { ...details, contentType: "text/html" })).rejects.toThrow("format");
});

test("follows are idempotent and select the followed author's chronological posts", async () => {
  const { owner, reader, readerId, ownerId, upload } = await setup();
  const first = await owner.mutation(social.publish, await upload());
  const second = await owner.mutation(social.publish, await upload());
  const following = () => reader.query(social.feed, { scope: "following", paginationOpts });
  expect((await following()).page).toHaveLength(0);
  await expect(reader.mutation(social.setFollow, { profileId: readerId, following: true })).rejects.toThrow("yourself");
  for (let i = 0; i < 2; i++) await reader.mutation(social.setFollow, { profileId: ownerId, following: true });
  expect((await following()).page.map(p => p.id)).toEqual([second, first]);
  expect((await owner.query(social.me))?.followers).toBe(1);
  for (let i = 0; i < 2; i++) await reader.mutation(social.setFollow, { profileId: ownerId, following: false });
  expect((await following()).page).toHaveLength(0);
  expect((await reader.query(social.me))?.followingCount).toBe(0);
});

test("keeps reaction counts consistent and restricts deletion to the owner", async () => {
  const { owner, reader, t, upload } = await setup();
  const args = await upload();
  const postId = await owner.mutation(social.publish, args);
  for (const liked of [true, true, false, false, true]) await reader.mutation(social.setLike, { postId, liked });
  await expect(reader.mutation(social.addComment, { postId, text: "  " })).rejects.toThrow("Write a comment");
  const commentId = await reader.mutation(social.addComment, { postId, text: " Nice view " });
  expect((await owner.query(social.comments, { postId, paginationOpts })).page[0]).toMatchObject({ id: commentId, text: "Nice view", author: { isMe: false } });
  await expect(owner.mutation(social.deleteComment, { commentId })).rejects.toThrow("Only the author");
  await expect(reader.mutation(social.deletePost, { postId })).rejects.toThrow("Only the author");
  expect(await reader.query(social.getPost, { postId })).toMatchObject({ comments: 1, liked: true, likes: 1 });
  await reader.mutation(social.deleteComment, { commentId });
  expect(await reader.query(social.getPost, { postId })).toMatchObject({ comments: 0 });
  await reader.mutation(social.addComment, { postId, text: "Another comment" });
  await owner.mutation(social.deletePost, { postId });
  expect(await reader.query(social.getPost, { postId })).toBeNull();
  expect(await t.run(ctx => ctx.storage.getUrl(args.storageId))).toBeNull();
  await t.finishAllScheduledFunctions(vi.runAllTimers);
  expect(await t.run(ctx => ctx.db.query("comments").first())).toBeNull();
  expect(await t.run(ctx => ctx.db.query("likes").first())).toBeNull();
});

test("expires abandoned files while preserving an unrelated file with identical bytes", async () => {
  const { owner, t, upload } = await setup();
  const abandoned = await upload();
  const committed = await upload();
  await owner.mutation(social.publish, committed);
  const unrelated = await t.run(ctx => ctx.storage.store(photo));
  await t.finishAllScheduledFunctions(vi.runAllTimers);
  expect(await t.run(ctx => ctx.storage.getUrl(abandoned.storageId))).toBeNull();
  expect(await t.run(ctx => ctx.storage.getUrl(committed.storageId))).toBeTruthy();
  expect(await t.run(ctx => ctx.storage.getUrl(unrelated))).toBeTruthy();
});

test("sorts comments and maintains viewer-specific comment likes through deletion", async () => {
  const { t, owner, reader, upload } = await setup();
  const postId = await owner.mutation(social.publish, await upload());
  const first = await owner.mutation(social.addComment, { postId, text: "First" });
  const second = await reader.mutation(social.addComment, { postId, text: "Second" });
  const options = { postId, paginationOpts };
  expect((await owner.query(social.comments, options)).page.map(c => c.id)).toEqual([second, first]);
  expect((await owner.query(social.comments, { ...options, order: "asc" })).page.map(c => c.id)).toEqual([first, second]);
  await expect(t.mutation(social.setCommentLike, { commentId: first, liked: true })).rejects.toThrow("Sign in");
  for (const liked of [true, true, false, false, true]) {
    await owner.mutation(social.setCommentLike, { commentId: first, liked });
  }
  expect((await reader.query(social.comments, options)).page[1]).toMatchObject({ likes: 1, liked: false });
  expect((await owner.query(social.comments, options)).page[1]).toMatchObject({ likes: 1, liked: true });
  await owner.mutation(social.setCommentLike, { commentId: second, liked: true });
  await reader.mutation(social.deleteComment, { commentId: second });
  await expect(reader.mutation(social.setCommentLike, { commentId: second, liked: true })).rejects.toThrow("deleted");
  await t.finishAllScheduledFunctions(vi.runAllTimers);
  expect((await t.run(ctx => ctx.db.query("commentLikes").take(2))).map(c => c.commentId)).toEqual([first]);
  await owner.mutation(social.deletePost, { postId });
  await t.finishAllScheduledFunctions(vi.runAllTimers);
  expect(await t.run(ctx => ctx.db.query("commentLikes").first())).toBeNull();
});
