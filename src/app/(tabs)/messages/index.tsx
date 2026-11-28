import { usePaginatedQuery, useQuery } from "convex/react";
import { Image } from "expo-image";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "../../../../convex/_generated/api";
import { useTabBarClearance } from "../../../components/navigation/GlassTabs";
import { FeedIcon } from "../../../components/home/FeedIcon";
import { relativeTime } from "../../../components/social/relativeTime";
import { useSocialSession } from "../../../components/social/SocialSession";

function openChat(handle: string) {
  router.push({ pathname: "/messages/[handle]", params: { handle } });
}

function ConversationAvatar({ handle, avatar }: { handle: string; avatar: string | null }) {
  const presence = useQuery(api.chatPresence.status, { handle });
  return (
    <View>
      <Image source={avatar || require("../../../../assets/images/home/avatar.jpg")} style={styles.avatar} />
      {presence?.online && <View accessibilityLabel="Active in this conversation" style={styles.online} />}
    </View>
  );
}

export default function MessagesScreen() {
  const tabBarClearance = useTabBarClearance();
  const contentStyle = { paddingBottom: tabBarClearance + 16 };
  const { ready, message } = useSocialSession();
  const [compose, setCompose] = useState(false);
  const [term, setTerm] = useState("");
  const inbox = usePaginatedQuery(api.messages.inbox, ready ? {} : "skip", { initialNumItems: 24 });
  const people = usePaginatedQuery(api.social.people, ready && compose ? {} : "skip", {
    initialNumItems: 32,
  });
  const emptyText = !ready
    ? message
    : inbox.status === "LoadingFirstPage"
      ? "Loading conversations…"
      : "No messages yet. Start a conversation.";

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.frame}>
        <View style={styles.header}>
          <View>
          <Text accessibilityRole="header" style={styles.title}>
            {compose ? "New message" : "Messages"}
          </Text>
          {!compose && <Text style={styles.caption}>Your conversations</Text>}
          </View>
          <Pressable
            style={!compose && styles.searchButton}
            accessibilityRole="button"
            accessibilityLabel={compose ? "Cancel search" : "Search people and start a conversation"}
            onPress={() => {
              setCompose(!compose);
              setTerm("");
            }}
            hitSlop={8}
          >
            {compose ? (
              <Text style={styles.cancel}>Cancel</Text>
            ) : (
              <FeedIcon name="search" size={19} color="#35384f" />
            )}
          </Pressable>
        </View>
        {compose ? (
          <>
            <TextInput
              accessibilityLabel="Search people"
              autoFocus
              placeholder="Search people"
              placeholderTextColor="#7435f9"
              value={term}
              onChangeText={setTerm}
              style={styles.search}
            />
            <FlatList
              data={people.results.filter((p) =>
                (p.name + " " + p.handle).toLowerCase().includes(term.trim().toLowerCase()),
              )}
              keyExtractor={(p) => p.id}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={contentStyle}
              onEndReached={() => {
                if (people.status === "CanLoadMore") people.loadMore(32);
              }}
              ListEmptyComponent={
                <Text style={styles.empty}>
                  {people.status === "Exhausted" ? "No people found" : "Loading people…"}
                </Text>
              }
              ListFooterComponent={
                people.status === "CanLoadMore" ? (
                  <Text onPress={() => people.loadMore(32)} style={styles.cancel}>
                    More people
                  </Text>
                ) : undefined
              }
              renderItem={({ item }) => (
                <Pressable
                  accessibilityRole="button"
                  style={styles.row}
                  onPress={() => {
                    setCompose(false);
                    openChat(item.handle);
                  }}
                >
                  <Image
                    source={item.avatar || require("../../../../assets/images/home/avatar.jpg")}
                    style={styles.avatar}
                  />
                  <View style={styles.details}>
                    <Text style={styles.name}>{item.name}</Text>
                    <Text style={styles.preview}>@{item.handle}</Text>
                  </View>
                </Pressable>
              )}
            />
          </>
        ) : (
          <FlatList
            data={inbox.results}
            keyExtractor={(row) => row.peer.id}
            contentContainerStyle={contentStyle}
            onEndReached={() => {
              if (inbox.status === "CanLoadMore") inbox.loadMore(24);
            }}
            ListEmptyComponent={<Text style={styles.empty}>{emptyText}</Text>}
            renderItem={({ item, index }) => (
              <Pressable
                accessibilityRole="button"
                onPress={() => openChat(item.peer.handle)}
                style={({ pressed }) => [styles.row, index === 0 && item.unread > 0 && styles.highlight, pressed && styles.pressed]}
              >
                <ConversationAvatar handle={item.peer.handle} avatar={item.peer.avatar} />
                <View style={styles.details}>
                  <Text numberOfLines={1} style={styles.name}>{item.peer.handle}</Text>
                  <Text numberOfLines={1} style={styles.preview}>{item.text}</Text>
                </View>
                <View style={styles.meta}>
                  <Text style={styles.time}>{relativeTime(item.updatedAt, true).replace(" ago", "")}</Text>
                  {item.unread > 0 && <View style={styles.badge}>
                    <Text style={styles.count}>{item.unread > 99 ? "99+" : item.unread}</Text>
                  </View>}
                </View>
                <View style={styles.chevron} />
              </Pressable>
            )}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1, backgroundColor: "#f6f4fc",
    backgroundImage: "linear-gradient(145deg, #eee9fb 0%, #f9f8fd 38%, #f2effb 76%, #efeffc 100%)",
  },
  frame: { flex: 1, width: "100%", maxWidth: 550, alignSelf: "center" },
  header: { minHeight: 86, marginHorizontal: 20, marginBottom: 10, paddingTop: 8, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { color: "#0b0a11", fontWeight: "700", fontSize: 30, letterSpacing: -1 },
  caption: { color: "#42455a", fontSize: 15, marginTop: 1 },
  searchButton: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center", backgroundColor: "#ffffff68", borderWidth: 1, borderColor: "#ffffffb0", boxShadow: "0px 2px 5px #6d619012" },
  search: { marginHorizontal: 12, marginBottom: 12, padding: 12, backgroundColor: "#eeebf7", borderRadius: 16 },
  cancel: { color: "#7435f9", padding: 8 },
  empty: { color: "#555168", padding: 24 },
  row: {
    flexDirection: "row", alignItems: "center", gap: 12, minHeight: 76, paddingVertical: 8,
    paddingLeft: 12, paddingRight: 15, marginHorizontal: 10, marginBottom: 10, borderRadius: 18,
    backgroundColor: "#faf9ffba", borderWidth: StyleSheet.hairlineWidth, borderColor: "#ffffffb8",
    boxShadow: "0px 4px 12px #62529112",
  },
  highlight: { backgroundColor: "#eee7fbdc", borderColor: "#e3d8ff" },
  pressed: { backgroundColor: "#e8e2f7" },
  avatar: { width: 58, height: 58, borderRadius: 29 },
  online: { position: "absolute", right: 1, bottom: 1, width: 14, height: 14, borderRadius: 7, backgroundColor: "#06c956", borderWidth: 2, borderColor: "white" },
  details: { flex: 1, minWidth: 0, gap: 3 },
  name: { color: "#101015", fontSize: 17, fontWeight: "700", letterSpacing: -0.4 },
  preview: { color: "#414459", fontSize: 14, letterSpacing: -0.15 },
  meta: { alignSelf: "stretch", alignItems: "center", justifyContent: "flex-start", paddingTop: 6, gap: 7 },
  time: { color: "#484a60", fontSize: 13 },
  badge: { minWidth: 20, height: 20, paddingHorizontal: 4, borderRadius: 10, backgroundColor: "#803bff", alignItems: "center", justifyContent: "center" },
  count: { color: "white", fontSize: 12, fontWeight: "600" },
  chevron: { width: 8, height: 8, marginLeft: 2, borderTopWidth: 1.5, borderRightWidth: 1.5, borderColor: "#3f4057", transform: [{ rotate: "45deg" }] },
});
