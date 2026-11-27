import { Image } from "expo-image";
import { StatusBar } from "expo-status-bar";
import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { type ComponentRef, useRef, useState } from "react";
import { FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { accent } from "../home/FeedIcon";
import { PostCard } from "../home/PostCard";
import { relativeTime } from "./relativeTime";

export function PostDialog({ postId, close, showPost = false }: { postId: Id<"posts">; close: () => void; showPost?: boolean }) {
  const [order, setOrder] = useState<"desc" | "asc">("desc");
  const [menuPosition, setMenuPosition] = useState<{ top: number; right: number } | null>(null);
  const surface = useRef<ComponentRef<typeof View>>(null);
  const sortButton = useRef<ComponentRef<typeof View>>(null);

  function openSortMenu() {
    const parent = surface.current;
    if (!parent) return;
    sortButton.current?.measureLayout(parent, (x, y, width, height) => {
      parent.measure((_x, _y, panelWidth, panelHeight) => {
        const below = y + height;
        const top = below + 94 <= panelHeight ? below : Math.max(0, y - 94);
        setMenuPosition({ top, right: Math.max(8, panelWidth - x - width) });
      });
    });
  }
  const post = useQuery(api.social.getPost, { postId });
  const comments = usePaginatedQuery(api.social.comments, post ? { postId, order } : "skip", { initialNumItems: 20 });
  const add = useMutation(api.social.addComment);
  const remove = useMutation(api.social.deleteComment);
  const like = useMutation(api.social.setCommentLike);
  const input = useRef<ComponentRef<typeof TextInput>>(null);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const pending = useRef(false);

  async function send() {
    if (!text.trim() || pending.current) return;
    pending.current = true;
    setSending(true);
    setError("");
    try { await add({ postId, text: text.trim() }); setText(""); }
    catch { setError("Couldn’t send comment. Try again."); }
    finally { setSending(false); pending.current = false; }
  }

  function reply(handle: string) {
    const mention = "@" + handle + " ";
    setText(draft => draft.startsWith(mention) ? draft : (mention + draft).slice(0, 1000));
    input.current?.focus();
  }

  return (
    <Modal visible animationType="slide" onRequestClose={menuPosition ? () => setMenuPosition(null) : close} presentationStyle="fullScreen">
      <StatusBar style="dark" />
      <KeyboardAvoidingView style={s.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <SafeAreaProvider>
          <View ref={surface} collapsable={false} style={s.safeArea} onLayout={() => setMenuPosition(null)}>
          <SafeAreaView style={s.safeArea} edges={["top", "left", "right"]}>
            <View style={s.header}>
              <Pressable accessibilityRole="button" accessibilityLabel="Close" style={s.back} onPress={close}><View style={[s.cross, s.forward]} /><View style={[s.cross, s.reverse]} /></Pressable>
              <Text accessibilityRole="header" style={s.title}>{showPost ? "Post" : "Comments"}</Text>
            </View>
            <FlatList style={s.panel} keyboardShouldPersistTaps="handled" data={comments.results}
              keyExtractor={item => item.id}
              ListHeaderComponent={<>
                {post && <>
                  <PostCard detail post={post} openComments={() => input.current?.focus()} />
                  <View style={s.section}>
                    <Text style={s.sectionTitle}>Comments ({post.comments})</Text>
                    <Pressable accessibilityRole="button" accessibilityLabel="Sort comments" ref={sortButton} accessibilityState={{ expanded: !!menuPosition }}
                      onPress={openSortMenu} style={s.sort}>
                      <Text style={s.sortText}>{order === "desc" ? "Newest" : "Oldest"}</Text><View style={s.down} />
                    </Pressable>
                  </View>
                </>}
              </>}
              ListEmptyComponent={<Text style={s.hint}>{post === null ? "This post is no longer available." :
                !post || comments.status === "LoadingFirstPage" ? "Loading…" : "Be the first to comment."}</Text>}
              renderItem={({ item }) => (
                <View style={s.comment}>
                  <Image source={item.author.avatar || require("../../../assets/images/home/avatar.jpg")} style={s.avatar} />
                  <View style={s.commentBody}>
                    <Text style={s.time}><Text style={s.author}>{item.author.name}</Text>{"  ·  "}{relativeTime(item.createdAt, true)}</Text>
                    <Text style={s.commentText}>{item.text}</Text>
                    <View style={s.actions}>
                      <Pressable accessibilityRole="button" accessibilityLabel={item.liked ? "Unlike comment" : "Like comment"}
                        accessibilityState={{ selected: item.liked }} hitSlop={3} style={s.reaction} onPress={() => {
                          setError(""); like({ commentId: item.id, liked: !item.liked }).catch(() => setError("Couldn’t update like. Try again."));
                        }}>
                        <Text style={[s.heart, item.liked && { color: accent }]}>{item.liked ? "♥" : "♡"}</Text><Text style={s.actionText}>{item.likes}</Text>
                      </Pressable>
                      <Pressable accessibilityRole="button" onPress={() => reply(item.author.handle)}><Text style={s.actionText}>Reply</Text></Pressable>
                      {item.author.isMe && <Pressable accessibilityRole="button" onPress={() => {
                        setError(""); remove({ commentId: item.id }).catch(() => setError("Couldn’t delete comment. Try again."));
                      }}><Text style={s.actionText}>Delete</Text></Pressable>}
                    </View>
                  </View>
                </View>
              )}
              onEndReached={() => { if (comments.status === "CanLoadMore") comments.loadMore(20); }}
              onEndReachedThreshold={0.4}
            />
            <SafeAreaView edges={["bottom"]} style={s.footer}>
              {!!error && <Text accessibilityRole="alert" style={s.hint}>{error}</Text>}
              {!!post && <View style={s.composer}>
                <TextInput ref={input} value={text} onChangeText={setText} editable={!sending} maxLength={1000} multiline
                  accessibilityLabel="Comment" placeholder="Add a comment..." placeholderTextColor="#73708b" style={s.input} />
                <Pressable accessibilityRole="button" disabled={sending || !text.trim()} onPress={send} style={s.send}>
                  <Text style={s.sendText}>{sending ? "Sending…" : "Send"}</Text>
                </Pressable>
              </View>}
            </SafeAreaView>
          </SafeAreaView>
          {menuPosition && <View style={StyleSheet.absoluteFill} accessibilityViewIsModal>
            <Pressable accessibilityRole="button" accessibilityLabel="Dismiss sort menu" style={StyleSheet.absoluteFill} onPress={() => setMenuPosition(null)} />
            <View style={[s.sortMenu, menuPosition]} accessibilityRole="menu">
              {(["desc", "asc"] as const).map(value => <Pressable key={value} accessibilityRole="menuitem"
                accessibilityState={{ selected: order === value }} style={[s.optionRow, value === "asc" && s.separator]}
                onPress={() => { setMenuPosition(null); setOrder(value); }}>
                <Text style={s.sortOption}>{value === "desc" ? "Newest first" : "Oldest first"}</Text>
                {order === value && <Text style={s.check}>✓</Text>}
              </Pressable>)}
            </View>
          </View>}
          </View>
        </SafeAreaProvider>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f3effb", backgroundImage: "linear-gradient(140deg, #f3effb, #fbfaff 44%, #eee9fc)" },
  safeArea: { flex: 1 },
  header: { minHeight: 44, justifyContent: "center", alignItems: "center" },
  back: { position: "absolute", left: 2, width: 44, height: 44, justifyContent: "center", alignItems: "center" },
  cross: { position: "absolute", width: 21, height: 2.3, borderRadius: 2, backgroundColor: "#101023" },
  forward: { transform: [{ rotate: "45deg" }] },
  reverse: { transform: [{ rotate: "-45deg" }] },
  title: { fontSize: 19, fontWeight: "700", letterSpacing: -0.5, color: "#101023" },
  panel: { flex: 1, marginHorizontal: 4, backgroundColor: "#fbfafd", borderRadius: 14 },
  section: { minHeight: 39, marginHorizontal: 8, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionTitle: { fontSize: 16, fontWeight: "700", letterSpacing: -0.45 },
  sort: { minHeight: 40, flexDirection: "row", alignItems: "center", gap: 6, paddingRight: 4 },
  sortText: { fontSize: 13, fontWeight: "600", color: accent },
  down: { width: 7, height: 7, marginTop: -3, borderBottomWidth: 1.7, borderRightWidth: 1.7, borderColor: accent, transform: [{ rotate: "45deg" }] },
  sortMenu: { position: "absolute", width: 178, borderRadius: 12, backgroundColor: "#fff", borderWidth: StyleSheet.hairlineWidth, borderColor: "#d9d4e4", boxShadow: "0px 4px 16px #30234230" },
  optionRow: { minHeight: 46, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 15 },
  separator: { borderTopWidth: StyleSheet.hairlineWidth, borderColor: "#ded9e6" },
  sortOption: { color: "#252034", fontSize: 15 },
  check: { color: accent, fontWeight: "600" },
  hint: { color: "#686479", paddingHorizontal: 10, paddingVertical: 12 },
  comment: { flexDirection: "row", marginHorizontal: 8, gap: 14, paddingTop: 7 },
  avatar: { width: 43, height: 42, borderRadius: 22 },
  commentBody: { flex: 1, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: "#d9d6e4", paddingBottom: 5 },
  author: { color: "#111017", fontSize: 12, fontWeight: "700" },
  time: { color: "#53536b", fontSize: 11, lineHeight: 16 },
  commentText: { color: "#101016", fontSize: 12.5, lineHeight: 17 },
  actions: { flexDirection: "row", alignItems: "center", gap: 22, minHeight: 26 },
  reaction: { flexDirection: "row", alignItems: "center", gap: 5 },
  heart: { fontSize: 18, color: "#151423" },
  actionText: { color: "#49495e", fontSize: 11, fontWeight: "500" },
  footer: { borderTopLeftRadius: 18, borderTopRightRadius: 18, backgroundColor: "#fbfafd", boxShadow: "0px -2px 7px #cfc6ec30" },
  composer: { flexDirection: "row", alignItems: "flex-end", gap: 8, paddingHorizontal: 12, paddingTop: 9, paddingBottom: 6 },
  input: { flex: 1, minHeight: 40, maxHeight: 100, paddingHorizontal: 20, paddingVertical: 9, borderRadius: 22, backgroundColor: "#eeebfc", fontSize: 14, color: "#151323" },
  send: { minWidth: 76, minHeight: 40, alignItems: "center", justifyContent: "center", borderRadius: 22, backgroundColor: accent, backgroundImage: "linear-gradient(155deg, #a66bfd, #6738ff)" },
  sendText: { fontSize: 14, fontWeight: "600", color: "white" },
});
