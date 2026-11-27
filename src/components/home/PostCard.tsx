import { Image } from "expo-image";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { FollowButton } from "../social/FollowButton";
import { relativeTime } from "../social/relativeTime";
import { PostVideo } from "../social/PostVideo";
import type { SocialPost } from "../social/types";
import { useState } from "react";
import { Alert, Pressable, Share, StyleSheet, Text, View } from "react-native";
import { accent, FeedIcon } from "./FeedIcon";
import { useSavedPosts } from "./SavedPosts";

export function PostCard({ post, openComments, detail = false }: { post: SocialPost; openComments: () => void; detail?: boolean }) {
  const setLike = useMutation(api.social.setLike);
  const deletePost = useMutation(api.social.deletePost);
  const [error, setError] = useState("");
  const [photoRatio, setPhotoRatio] = useState(1);
  const [playing, setPlaying] = useState(false);
  const liked = post.liked;
  const collection = useSavedPosts();
  const saved = collection.ids.includes(post.id);
  const [menu, setMenu] = useState(false);
  const likes = post.likes;
  const count = likes >= 1000 ? (likes / 1000).toFixed(1) + "K" : String(likes);

  function confirmDelete() {
    setMenu(false);
    Alert.alert("Delete post?", "This will also delete its likes and comments.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deletePost({ postId: post.id }).catch(() => setError("Couldn’t delete post. Try again.")) },
    ]);
  }
  function toggleSaved() {
    collection.toggle(post.id);
    setMenu(false);
  }

  return (
    <View style={detail ? styles.detailCard : styles.card}>
      <View style={[styles.header, detail && styles.detailHeader]}>
        <Image source={post.author.avatar || require("../../../assets/images/home/avatar.jpg")} style={[styles.avatar, detail && styles.detailAvatar]} />
        <View style={styles.byline}>
          <Text style={styles.author}>{post.author.name}</Text>
          <View style={styles.meta}>
            <Text style={styles.metaText}>{detail ? relativeTime(post.createdAt) : new Date(post.createdAt).toLocaleDateString()} ·</Text>
            <Text style={styles.metaText}>@{post.author.handle}</Text>
          </View>
        </View>
        {!detail && <FollowButton person={post.author} />}
        <Pressable accessibilityRole="button" accessibilityLabel="Post options" accessibilityState={{ expanded: menu }} onPress={() => setMenu(!menu)} style={styles.menuButton}>
          <FeedIcon name="more" size={22} />
        </Pressable>
      </View>
      {menu && <Pressable onPress={toggleSaved} accessibilityRole="button" style={styles.menuItem}><Text>{saved ? "Remove from saved posts" : "Save post"}</Text></Pressable>}
      {menu && detail && <View style={styles.menuItem}><FollowButton person={post.author} /><Pressable accessibilityRole="button" onPress={() => Share.share({ message: post.author.name + " on Snaply\n" + post.caption })}><Text>Share post</Text></Pressable></View>}
      {menu && post.author.isMe && <Pressable accessibilityRole="button" onPress={confirmDelete} style={styles.menuItem}><Text>Delete post</Text></Pressable>}
      {post.mediaType === "video" ? (
        <View style={[styles.photo, { aspectRatio: detail ? 762 / 285 : 1.6, backgroundColor: "#201b2d", justifyContent: "center", alignItems: "center" }]}>
          {playing ? <PostVideo uri={post.url} /> : <Pressable accessibilityRole="button" onPress={() => setPlaying(true)}><Text style={{ color: "white", padding: 16 }}>▶ Play video</Text></Pressable>}
        </View>
      ) : <Image accessible accessibilityLabel={post.caption || "Photo by " + post.author.name} source={post.url} contentFit="cover"
        onLoad={detail ? ({ source }) => {
          if (source.width > 0 && source.height > 0) setPhotoRatio(source.width / source.height);
        } : undefined}
        style={[styles.photo, { aspectRatio: detail ? photoRatio : 1.6 }]} />}
      <View style={detail ? styles.detailBody : styles.body}>
        {detail && !!post.caption && <Text style={styles.detailCaption}>{post.caption}</Text>}
        <View style={styles.actions}>
          <Pressable accessibilityRole="button" accessibilityLabel={liked ? "Unlike post" : "Like post"} accessibilityState={{ selected: liked }} onPress={() => { setError(""); setLike({ postId: post.id, liked: !liked }).catch(() => setError("Couldn’t update like. Try again.")); }} style={styles.action}>
            <FeedIcon name="heart" size={detail ? 19 : 24} color={liked ? accent : "#a5a1b4"} />
            <Text style={styles.count}>{count}{detail && (likes === 1 ? " Like" : " Likes")}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={openComments} accessibilityLabel={post.comments + " comments"} style={styles.action}>
            <FeedIcon name="comment" size={detail ? 18 : 22} /><Text style={styles.count}>{post.comments}{detail && (post.comments === 1 ? " Comment" : " Comments")}</Text>
          </Pressable>
          {!detail && <><Pressable accessibilityRole="button" accessibilityLabel="Share post" style={styles.action} onPress={() => Share.share({ message: post.author.name + " on Snaply\n" + post.caption })}>
            <FeedIcon name="send" size={22} />
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={saved ? "Unsave post" : "Save post"} accessibilityState={{ selected: saved }} onPress={toggleSaved} style={[styles.action, styles.save]}>
            <FeedIcon name="bookmark" size={21} color={saved ? accent : "#101018"} />
          </Pressable></>}
        </View>
        {!detail && <><Text style={styles.caption}><Text style={styles.captionAuthor}>{post.author.name}</Text>{"  "}{post.caption}</Text>
        <Pressable accessibilityRole="button" onPress={openComments}><Text style={styles.comments}>{post.comments ? "View all " + post.comments + " comments" : "Add a comment"}</Text></Pressable></>}
        {!!error && <Text accessibilityRole="alert">{error}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  detailCard: { paddingHorizontal: 8 },
  detailHeader: { minHeight: 59, paddingHorizontal: 3, paddingVertical: 6 },
  detailAvatar: { width: 44, height: 44, borderRadius: 22 },
  detailBody: { paddingHorizontal: 1, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: "#d9d6e4" },
  detailCaption: { fontSize: 14, lineHeight: 18, color: "#0c0b13", marginTop: 8 },
  card: { marginLeft: 6, marginRight: 3, marginBottom: 10, backgroundColor: "#fbfafd", borderRadius: 14, borderColor: "#e5dfff", borderWidth: StyleSheet.hairlineWidth },
  header: { minHeight: 63, paddingHorizontal: 10, paddingVertical: 8, flexDirection: "row", alignItems: "center", gap: 10 },
  avatar: { width: 47, height: 47, borderRadius: 24 },
  byline: { flex: 1, gap: 4 },
  author: { fontSize: 15, fontWeight: "700", letterSpacing: -0.4, color: "#100e27" },
  meta: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", columnGap: 3 },
  metaText: { fontSize: 12, color: "#16134d", letterSpacing: -0.3 },
  menuButton: { minWidth: 36, minHeight: 44, justifyContent: "center", alignItems: "flex-end" },
  menuItem: { alignSelf: "flex-end", padding: 12 },
  photo: { width: "100%", borderRadius: 12 },
  body: { paddingHorizontal: 11, paddingBottom: 13 },
  actions: { flexDirection: "row", alignItems: "center", gap: 23, minHeight: 44 },
  action: { minHeight: 44, flexDirection: "row", alignItems: "center", gap: 7 },
  save: { marginLeft: "auto", minWidth: 36, justifyContent: "flex-end" },
  count: { fontSize: 14, fontWeight: "500", color: "#101015", letterSpacing: -0.4 },
  caption: { fontSize: 14, lineHeight: 18, letterSpacing: -0.32, color: "#0b0b12" },
  captionAuthor: { fontWeight: "700" },
  comments: { marginTop: 7, fontSize: 13.5, lineHeight: 17, color: "#171353", letterSpacing: -0.25 },
});
