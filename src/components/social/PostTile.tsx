import { Image } from "expo-image";
import { Pressable, Text } from "react-native";
import type { SocialPost } from "./types";

export function PostTile({ post, width, onPress }: { post: SocialPost; width: number; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={post.caption || "Open post"} onPress={onPress}
    style={{ width, aspectRatio: 1.25, borderRadius: 10, overflow: "hidden", alignItems: "center", justifyContent: "center", backgroundColor: "#ece7f8" }}>
    {post.mediaType === "video" ? <Text>▶ Video</Text> : <Image source={post.url} style={{ width: "100%", height: "100%" }} />}
  </Pressable>;
}
