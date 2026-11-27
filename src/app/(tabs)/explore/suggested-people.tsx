import { usePaginatedQuery } from "convex/react";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "../../../../convex/_generated/api";
import { FollowButton } from "../../../components/social/FollowButton";
import { useSocialSession } from "../../../components/social/SocialSession";

export default function SuggestedPeopleScreen() {
  const { query } = useLocalSearchParams<{ query?: string }>();
  const connection = useSocialSession();
  const people = usePaginatedQuery(api.social.people, connection.ready ? {} : "skip", { initialNumItems: 16 });
  const term = query?.trim().toLowerCase() || "";
  const matches = people.results.filter(person => (person.name + " " + person.handle).toLowerCase().includes(term));

  function loadMore() {
    if (people.status === "CanLoadMore") people.loadMore(16);
  }

  return (
    <SafeAreaView style={s.screen}>
      <StatusBar style="dark" />
      <View style={s.page}>
        <View style={s.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="Back to Explore" hitSlop={6}
            onPress={() => router.canGoBack() ? router.back() : router.replace("/explore")} style={s.back}>
            <Text style={s.arrow}>←</Text>
          </Pressable>
          <Text accessibilityRole="header" style={s.title}>Suggested People</Text>
        </View>
        <FlatList data={matches} keyExtractor={person => person.id} contentContainerStyle={s.list}
          onEndReached={loadMore} onEndReachedThreshold={0.5}
          ListEmptyComponent={<Text style={s.status}>{!connection.ready ? connection.message : people.status === "Exhausted" ? "No people found" : "Loading people…"}</Text>}
          renderItem={({ item }) => (
            <View style={s.row}>
              <Pressable accessibilityRole="button" accessibilityLabel={"Message " + item.name} style={s.contact} onPress={() => router.push({pathname:"/messages/[handle]", params:{handle:item.handle}})}>
              <Image source={item.avatar || require("../../../../assets/images/home/avatar.jpg")} contentFit="cover" style={s.avatar} />
              <View style={s.details}>
                <Text numberOfLines={1} style={s.name}>{item.name}</Text>
                <Text numberOfLines={1} style={s.handle}>@{item.handle}</Text>
                <View style={s.meta}>
                  <Image source={require("../../../../assets/images/explore/people.png")} style={s.peopleIcon} />
                  <Text numberOfLines={1} style={s.count}>{item.followers} {item.followers === 1 ? "follower" : "followers"} · {item.posts} {item.posts === 1 ? "post" : "posts"}</Text>
                </View>
              </View>
              </Pressable>
              <FollowButton person={item} list />
            </View>
          )}
        />
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#fdfcff" },
  page: { flex: 1, alignSelf: "center", width: "100%", maxWidth: 550 },
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 17, paddingTop: 4, paddingBottom: 16 },
  back: { width: 35, height: 34, borderRadius: 11, backgroundColor: "#eeeafa", alignItems: "center", justifyContent: "center" },
  arrow: { fontSize: 22, color: "#17142c" },
  title: { fontSize: 21, fontWeight: "800", letterSpacing: -0.6, color: "#100e23" },
  list: { paddingHorizontal: 9, paddingTop: 5, paddingBottom: 10, gap: 6 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 12, paddingVertical: 6, minHeight: 62, backgroundColor: "white", borderRadius: 15, boxShadow: "0px 2px 6px #5b44a324" },
  contact: {flex:1, minWidth:0, flexDirection:"row", alignItems:"center", gap:12},
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: "#eeeafa" },
  details: { flex: 1, minWidth: 0, gap: 1 },
  name: { fontSize: 14, fontWeight: "700", color: "#100e23" },
  handle: { fontSize: 12, color: "#36324e" },
  meta: { flexDirection: "row", alignItems: "center", gap: 5 },
  peopleIcon: { width: 13, height: 13, tintColor: "#514d67" },
  count: { flexShrink: 1, fontSize: 11, color: "#514d67" },
  status: { padding: 20, textAlign: "center", color: "#514d67" },
});
