import { Image } from "expo-image";
import { useState } from "react";
import { Pressable, Share, StyleSheet, Text, View } from "react-native";
import { accent, FeedIcon } from "./FeedIcon";
import { useSavedPosts } from "./SavedPosts";
import type { Post } from "./content";

export function PostCard({ post }: { post: Post }) {
  const [liked, setLiked] = useState(post.liked);
  const collection = useSavedPosts();
  const saved = collection.ids.includes(post.id);
  const [menu, setMenu] = useState(false);
  const likes = post.likes + Number(liked) - Number(post.liked);
  const count = likes >= 1000 ? (likes / 1000).toFixed(1) + "K" : String(likes);

  function toggleSaved() {
    collection.toggle(post.id);
    setMenu(false);
  }

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Image source={post.avatar} style={styles.avatar} />
        <View style={styles.byline}>
          <Text style={styles.author}>{post.author}</Text>
          <View style={styles.meta}>
            <Text style={styles.metaText}>{post.time} ·</Text>
            <FeedIcon name="pin" size={11} color="#171349" />
            <Text style={styles.metaText}>{post.location}</Text>
          </View>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Post options" accessibilityState={{ expanded: menu }} onPress={() => setMenu(!menu)} style={styles.menuButton}>
          <FeedIcon name="more" size={22} />
        </Pressable>
      </View>
      {menu && <Pressable onPress={toggleSaved} accessibilityRole="button" style={styles.menuItem}><Text>{saved ? "Remove from saved posts" : "Save post"}</Text></Pressable>}
      <Image accessible accessibilityLabel={post.description} source={post.photo} style={[styles.photo, { aspectRatio: post.aspectRatio }]} />
      <View style={styles.body}>
        <View style={styles.actions}>
          <Pressable accessibilityRole="button" accessibilityLabel={liked ? "Unlike post" : "Like post"} accessibilityState={{ selected: liked }} onPress={() => setLiked(!liked)} style={styles.action}>
            <FeedIcon name="heart" size={24} color={liked ? accent : "#a5a1b4"} />
            <Text style={styles.count}>{count}</Text>
          </Pressable>
          <View accessible accessibilityLabel={post.comments + " comments"} style={styles.action}>
            <FeedIcon name="comment" size={22} /><Text style={styles.count}>{post.comments}</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Share post" style={styles.action} onPress={() => Share.share({ message: post.author + " on Snaply\n" + post.caption })}>
            <FeedIcon name="send" size={22} />
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={saved ? "Unsave post" : "Save post"} accessibilityState={{ selected: saved }} onPress={toggleSaved} style={[styles.action, styles.save]}>
            <FeedIcon name="bookmark" size={21} color={saved ? accent : "#101018"} />
          </Pressable>
        </View>
        <Text style={styles.caption}><Text style={styles.captionAuthor}>{post.author}</Text>{"  "}{post.caption}</Text>
        <Text style={styles.comments}>View all {post.comments} comments</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
