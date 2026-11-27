import { usePaginatedQuery } from "convex/react";
import { Image } from "expo-image";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "../../../../convex/_generated/api";
import { relativeTime } from "../../../components/social/relativeTime";
import { useSocialSession } from "../../../components/social/SocialSession";

function openChat(handle: string) {
  router.push({ pathname: "/messages/[handle]", params: { handle } });
}

export default function MessagesScreen() {
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
          <Text accessibilityRole="header" style={styles.title}>
            {compose ? "New message" : "Messages"}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={compose ? "Cancel new message" : "New message"}
            onPress={() => {
              setCompose(!compose);
              setTerm("");
            }}
            hitSlop={8}
          >
            {compose ? (
              <Text style={styles.cancel}>Cancel</Text>
            ) : (
              <Image
                source={require("../../../../assets/images/messages/chat.png")}
                style={styles.icon}
              />
            )}
          </Pressable>
        </View>
        {compose ? (
          <>
            <TextInput
              accessibilityLabel="Search people"
              placeholder="Search people"
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
              contentContainerStyle={styles.content}
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
            contentContainerStyle={styles.content}
            onEndReached={() => {
              if (inbox.status === "CanLoadMore") inbox.loadMore(24);
            }}
            ListEmptyComponent={<Text style={styles.empty}>{emptyText}</Text>}
            renderItem={({ item }) => (
              <Pressable
                accessibilityRole="button"
                onPress={() => openChat(item.peer.handle)}
                style={styles.row}
              >
                <Image
                  source={item.peer.avatar || require("../../../../assets/images/home/avatar.jpg")}
                  style={styles.avatar}
                />
                <View style={styles.details}>
                  <Text numberOfLines={1} style={styles.name}>
                    {item.peer.handle}
                  </Text>
                  <View style={styles.subtitle}>
                    <Text numberOfLines={1} style={[styles.preview, styles.snippet]}>
                      {item.text}
                    </Text>
                    <Text style={styles.preview}>
                      {" "}
                      · {relativeTime(item.updatedAt, true).replace(" ago", "")}
                    </Text>
                  </View>
                </View>
                {item.unread > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.count}>{item.unread > 99 ? "99+" : item.unread}</Text>
                  </View>
                )}
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
    flex: 1,
    backgroundColor: "#f9f8fd",
    backgroundImage: "linear-gradient(105deg, #fcfbfd, #f4f3fc)",
  },
  frame: {
    flex: 1,
    width: "100%",
    maxWidth: 550,
    alignSelf: "center",
    paddingHorizontal: 18,
    paddingTop: 12,
  },
  content: { paddingBottom: 16 },
  search: { padding: 12, backgroundColor: "#eeebf7", borderRadius: 16 },
  cancel: { color: "#7435f9", padding: 6 },
  empty: { color: "#555168", paddingVertical: 24 },
  snippet: { flexShrink: 1 },
  subtitle: { flexDirection: "row" },
  header: {
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  title: { fontSize: 34, fontWeight: "700", letterSpacing: -1.1, color: "#080809" },
  icon: { width: 28, height: 27 },
  row: { flexDirection: "row", alignItems: "center", gap: 17, minHeight: 88.5, paddingVertical: 10 },
  avatar: { width: 65.5, height: 65.5, borderRadius: 33 },
  details: { flex: 1, gap: 4 },
  name: { fontSize: 20, fontWeight: "700", letterSpacing: -0.45, color: "#090909" },
  preview: { fontSize: 16, letterSpacing: -0.25, color: "#42475a" },
  badge: {
    minWidth: 25,
    minHeight: 25,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#7735ff",
  },
  count: { color: "#fff", fontSize: 14, fontWeight: "600" },
});
