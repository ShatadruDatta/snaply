import { Image } from "expo-image";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useRef, useState } from "react";
import { Button, FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { accent, FeedIcon } from "./FeedIcon";
import { PostCard } from "./PostCard";
import { usePaginatedQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { useSocialSession } from "../social/SocialSession";
import { PostDialog } from "../social/PostDialog";
import { useTabBarClearance } from "../navigation/GlassTabs";
import { ProfileAvatar } from "../profile/ProfileAvatar";
import { stories } from "./content";

const filters = ["For You", "Following", "Trending"] as const;
export function HomeFeed() {
  const insets = useSafeAreaInsets();
  const tabBarClearance = useTabBarClearance();
  const { width } = useWindowDimensions();
  const storySize = Math.min(65, Math.max(54, (width - 75) / 5));
  const feed = useRef<FlatList>(null);
  const [filter, setFilter] = useState<(typeof filters)[number]>("For You");
  const [story, setStory] = useState<(typeof stories)[number] | null>(null);
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState("");

  const [postId, setPostId] = useState<Id<"posts">>();
  function openSearch() {
    setSearching(true);
    feed.current?.scrollToOffset({ offset: 0, animated: true });
  }

  function closeSearch() {
    setSearching(false);
    setQuery("");
  }

  const connection = useSocialSession();
  const scope = filter === "Following" ? "following" : filter === "Trending" ? "trending" : "recent";
  const { results, status, loadMore } = usePaginatedQuery(api.social.feed, connection.ready ? { scope } : "skip", { initialNumItems: 16 });
  const visible = results.filter(post => (post.author.name + " " + post.author.handle + " " + post.caption)
    .toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <View style={[styles.screen, { paddingTop: insets.top, paddingLeft: insets.left, paddingRight: insets.right }]}>
      <StatusBar style="dark" />
      <View style={styles.column}>
        <View style={styles.header}>
          <View style={styles.brand} accessible accessibilityLabel="Snaply">
            <Image source={require("../../../assets/images/snaply-launch-mark.png")} style={styles.logo} />
            <Text style={styles.wordmark}>Snaply</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Search feed" onPress={searching ? closeSearch : openSearch} style={styles.headerButton}>
            <FeedIcon name="search" size={21} />
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Open profile" onPress={() => router.push("/account")} style={styles.headerButton}>
            <ProfileAvatar style={styles.profile} />
          </Pressable>
        </View>
        {searching && (
          <View style={styles.searchRow}>
            <TextInput accessibilityLabel="Search feed" placeholder="Search people, places, and posts" value={query} onChangeText={setQuery} autoFocus returnKeyType="search" style={styles.input} />
            <Pressable accessibilityRole="button" onPress={closeSearch}><Text style={styles.searchClose}>Cancel</Text></Pressable>
          </View>
        )}
        <FlatList ref={feed} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} style={styles.feed}
          contentContainerStyle={{ paddingBottom: tabBarClearance + 8 }}
          data={visible} keyExtractor={post => post.id}
          renderItem={({ item }) => <PostCard post={item} openComments={() => setPostId(item.id)} />}
          ListEmptyComponent={<Text style={styles.empty}>{!connection.ready ? connection.message : status === "LoadingFirstPage" ? "Loading posts…" : query ? "No matching posts" :
            filter === "Following" ? "Follow people in Explore to see their posts here." : "Your feed is ready for its first post."}</Text>}
          ListFooterComponent={status === "CanLoadMore" ? <Button title="More posts" onPress={() => loadMore(16)} /> : undefined}
          ListHeaderComponent={<>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.stories}>
            <View style={[styles.addStory, { width: storySize + 8, minHeight: storySize + 17 }]}>
              <View style={styles.addCircle}><Text style={styles.plus}>+</Text></View>
              <Text style={styles.storyLabel}>Add Story</Text>
            </View>
            {stories.map(person => (
              <Pressable key={person.name} onPress={() => setStory(person)} accessibilityRole="button" accessibilityLabel={"View " + person.name + "’s story"} style={styles.story}>
                <View style={[styles.ring, { width: storySize, height: storySize, borderRadius: storySize / 2 }]}>
                  <Image source={person.portrait} style={styles.portrait} />
                </View>
                <Text style={styles.storyLabel}>{person.name}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <View style={styles.filters} accessibilityRole="tablist">
            {filters.map(item => (
              <Pressable key={item} onPress={() => setFilter(item)} accessibilityRole="tab" accessibilityState={{ selected: filter === item }} style={[styles.pill, filter === item && styles.selectedPill]}>
                <Text style={[styles.pillLabel, filter === item && styles.selectedLabel]}>{item}</Text>
              </Pressable>
            ))}
          </View>
        </>} />
      </View>
      {connection.ready && postId && <PostDialog postId={postId} close={() => setPostId(undefined)} />}
      <Modal visible={story !== null} transparent animationType="fade" onRequestClose={() => setStory(null)}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close story" onPress={() => setStory(null)} style={styles.backdrop}>
          {story && <View style={styles.storyPreview}><Image source={story.portrait} style={styles.storyImage} /><Text style={styles.storyTitle}>{story.name}</Text></View>}
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f8f7fc", backgroundImage: "linear-gradient(145deg, #f5f3fc, #fcfbfd 40%, #f0edfb 80%, #fbfafd)" },
  column: { flex: 1, width: "100%", maxWidth: 550, alignSelf: "center" },
  header: { minHeight: 44, paddingLeft: 20, paddingRight: 11, flexDirection: "row", alignItems: "center", gap: 14 },
  brand: { flex: 1, flexDirection: "row", alignItems: "center", gap: 6 },
  logo: { width: 35, height: 35 },
  wordmark: { color: "#0b0c21", fontWeight: "800", fontSize: 26, letterSpacing: -1.1 },
  headerButton: { width: 44, minHeight: 44, alignItems: "center", justifyContent: "center" },
  profile: { width: 36, height: 36, borderRadius: 18 },
  searchRow: { flexDirection: "row", padding: 10, alignItems: "center", gap: 8 },
  input: { flex: 1, color: "#17122c", backgroundColor: "#eeebfa", borderRadius: 20, padding: 10 },
  searchClose: { color: accent, paddingVertical: 10 },
  feed: { flex: 1 },
  stories: { flexDirection: "row", alignItems: "stretch", gap: 13, paddingLeft: 16, paddingRight: 8, paddingTop: 5 },
  addStory: { justifyContent: "center", alignItems: "center", gap: 8, borderRadius: 18, backgroundColor: "#ece8fb" },
  addCircle: { width: 37, height: 37, borderRadius: 19, backgroundColor: "#b696ff", alignItems: "center", justifyContent: "center" },
  plus: { fontSize: 26, lineHeight: 30, fontWeight: "300", color: "#fff" },
  story: { alignItems: "center", gap: 3 },
  ring: { borderWidth: 2, borderColor: "#8647ff", backgroundColor: "white", padding: 2 },
  portrait: { width: "100%", height: "100%", borderRadius: 100 },
  storyLabel: { color: "#111015", fontSize: 12, lineHeight: 15, fontWeight: "500", letterSpacing: -0.25 },
  filters: { flexDirection: "row", gap: 7, paddingLeft: 15, paddingRight: 12, marginTop: 15, marginBottom: 14 },
  pill: { flex: 1, minHeight: 33, borderRadius: 20, justifyContent: "center", alignItems: "center", backgroundColor: "#f1effa", borderColor: "#ded8ff", borderWidth: StyleSheet.hairlineWidth },
  selectedPill: { borderWidth: 0, backgroundColor: accent, backgroundImage: "linear-gradient(175deg, #ac69fb, #6730ff)" },
  pillLabel: { color: "#100e36", fontWeight: "600", fontSize: 14, letterSpacing: -0.35 },
  selectedLabel: { color: "#fff", fontWeight: "500" },
  hidden: { display: "none" },
  empty: { textAlign: "center", padding: 24, color: "#48435d" },
  backdrop: { flex: 1, padding: 28, alignItems: "center", justifyContent: "center", backgroundColor: "#151126ce" },
  storyPreview: { width: "100%", maxWidth: 360, borderRadius: 22, overflow: "hidden", backgroundColor: "#211c2e" },
  storyImage: { width: "100%", aspectRatio: 1 },
  storyTitle: { color: "white", fontWeight: "700", fontSize: 17, padding: 15 },
});
