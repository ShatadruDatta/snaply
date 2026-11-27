/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob(["./**/*.ts", "./_generated/*.js", "!./**/*.test.ts"]);
const paginationOpts = { cursor: null, numItems: 10 };

async function setup() {
  const t = convexTest(schema, modules);
  const [alice, bob, eve] = ["Alice", "Bob", "Eve"].map(name => t.withIdentity({ name, subject: name }));
  for (const user of [alice, bob, eve]) await user.mutation(api.social.ensureProfile, {});
  return { t, alice, bob, eve };
}

test("only participants see a conversation, retries send once, and stale reads preserve newer unread messages", async () => {
  const { t, alice, bob, eve } = await setup();
  const args = { handle: "bob", clientId: "1", text: " Hello " };
  await expect(t.mutation(api.messages.send, args)).rejects.toThrow("Sign in");
  const [id, retried] = await Promise.all([alice.mutation(api.messages.send, args), alice.mutation(api.messages.send, args)]);
  expect(id).toEqual(retried);
  expect((await bob.query(api.messages.inbox, { paginationOpts })).page[0]).toMatchObject({ peer: { handle: "alice" }, text: "Hello", unread: 1 });
  const id2 = await alice.mutation(api.messages.send, { ...args, text: "Next", clientId: "2" });
  await bob.mutation(api.messages.markRead, { handle: "alice", throughId: id });
  expect((await bob.query(api.messages.inbox, { paginationOpts })).page[0].unread).toBe(2);
  await bob.mutation(api.messages.markRead, { handle: "alice", throughId: id2 });
  expect((await bob.query(api.messages.inbox, { paginationOpts })).page[0].unread).toBe(0);
  await bob.mutation(api.messages.send, { handle: "alice", clientId: "1", text: "Hi!" });
  expect((await alice.query(api.messages.inbox, { paginationOpts })).page).toHaveLength(1);
  const page = await alice.query(api.messages.history, { handle: "bob", paginationOpts: { ...paginationOpts, numItems: 1 } });
  expect(page.page[0]).toMatchObject({ text: "Hi!", mine: false });
  const older = await alice.query(api.messages.history, { handle: "bob", paginationOpts: { ...paginationOpts, cursor: page.continueCursor } });
  expect(older.page.map(row => row.id)).toEqual([id2, id]);
  for (const handle of ["alice", "bob"]) expect((await eve.query(api.messages.history, { handle, paginationOpts })).page).toHaveLength(0);
  expect((await eve.query(api.messages.inbox, { paginationOpts })).page).toHaveLength(0);
  await expect(alice.mutation(api.messages.send, { ...args, handle: "alice" })).rejects.toThrow("another person");
  await expect(alice.mutation(api.messages.send, { ...args, handle: "eve" })).rejects.toThrow("already in use");
});

test("sends verified private attachments, rejects mismatched kinds and scopes, and supplies a meaningful attachment preview", async () => {
  const { t, alice, bob } = await setup();
  const bytes = new TextEncoder().encode("test audio bytes");
  const sha256 = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)), n => n.toString(16).padStart(2, "0")).join("");
  const details = { sha256, size: bytes.length, contentType: "audio/webm; codecs=opus" };
  const { uploadId, uploadContentType } = await alice.mutation(api.messages.beginUpload, details);
  const storageId = await t.run(ctx => ctx.storage.store(new Blob([bytes], { type: uploadContentType })));
  const upload = { uploadId, storageId };
  const args = { handle: "bob", text: "", voice: upload, clientId: "audio" };
  await expect(bob.mutation(api.messages.send, { ...args, handle: "alice" })).rejects.toThrow("message upload");
  await expect(alice.mutation(api.social.publish, { ...upload, caption: "" })).rejects.toThrow("upload expired");
  await expect(alice.mutation(api.messages.send, { ...args, voice: undefined, attachments: [upload] })).rejects.toThrow("format");
  const id = await alice.mutation(api.messages.send, args);
  expect(await alice.mutation(api.messages.send, args)).toBe(id);
  const voice = (await bob.query(api.messages.history, { handle: "alice", paginationOpts })).page[0];
  expect(voice.audio).toEqual(expect.any(String));
  expect((await bob.query(api.messages.inbox, { paginationOpts })).page[0].text).toBe("Voice message");
  await alice.mutation(api.messages.send, { handle: "bob", text: "", location: "  Triund  ", clientId: "place" });
  expect((await bob.query(api.messages.inbox, { paginationOpts })).page[0].text).toBe("Triund");
  await expect(alice.mutation(api.messages.send, { ...args, clientId: "reuse" })).rejects.toThrow("message upload");
});

test("presence is isolated per pair and multiple foreground sessions aggregate", async () => {
  const { register } = await import("@convex-dev/presence/test");
  const { t, alice, bob, eve } = await setup();
  register(t);
  const state = () => bob.query(api.chatPresence.status, { handle: "alice" });
  const beat = (session: string, channel: "online" | "typing") => alice.mutation(api.chatPresence.heartbeat, { handle: "bob", session, channel });
  const first = await beat("phone", "online");
  const second = await beat("tablet", "online");
  const typing = await beat("phone", "typing");
  expect(await state()).toEqual({ online: true, typing: true });
  expect(await eve.query(api.chatPresence.status, { handle: "alice" })).toEqual({ online: false, typing: false });
  await alice.mutation(api.chatPresence.disconnect, { sessionToken: typing });
  await alice.mutation(api.chatPresence.disconnect, { sessionToken: first });
  expect(await state()).toEqual({ online: true, typing: false });
  await alice.mutation(api.chatPresence.disconnect, { sessionToken: second });
  expect(await state()).toEqual({ online: false, typing: false });
});
