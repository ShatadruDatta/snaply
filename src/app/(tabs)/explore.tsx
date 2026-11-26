import { Image } from "expo-image";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { categories, people, tiles } from "../../components/explore/content";
import { accent, FeedIcon } from "../../components/home/FeedIcon";
import { useSessionProfile } from "../../components/profile/SessionProfile";

export default function ExploreScreen() {
  const { profile } = useSessionProfile();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const page = Math.min(width - insets.left - insets.right, 550);
  const u = page / 812;
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("For You");
  const [following, setFollowing] = useState<string[]>([]);
  const [panel, setPanel] = useState("");
  const [preview, setPreview] = useState<(typeof tiles)[number]>();
  const term = query.trim().toLowerCase();
  const matches = tiles.filter(item => (category === "For You" || item.tags.includes(category.toLowerCase())) &&
    (item.label + " " + item.tags).toLowerCase().includes(term));
  const suggested = people.filter(item => item.name.toLowerCase().includes(term));
  const showPeople = (category === "For You" || category === "People") && suggested.length > 0;

  function toggle(name: string) {
    setFollowing(current => current.includes(name) ? current.filter(item => item !== name) : [...current, name]);
  }
  function close() {
    setPanel("");
    setPreview(undefined);
  }
  return (
    <View style={[s.screen, { paddingTop: insets.top, paddingLeft: insets.left, paddingRight: insets.right }]}>
      <StatusBar style="dark" />
      <ScrollView keyboardShouldPersistTaps="handled" automaticallyAdjustContentInsets={false} contentInsetAdjustmentBehavior="never" showsVerticalScrollIndicator={false} contentContainerStyle={{ alignItems: "center", paddingBottom: insets.bottom + 80 }}>
        <View style={{ width: page }}>
          <View style={s.header}>
            <Image source={require("../../../assets/images/snaply-launch-mark.png")} style={s.logo} />
            <Text style={s.brand}>Snaply</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Notifications" onPress={() => setPanel("Notifications")} style={s.headerButton}>
              <Image source={require("../../../assets/images/profile/bell.png")} tintColor="#0e0d17" style={s.bell} /><View style={s.dot} />
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Open profile" onPress={() => router.navigate("/account")} style={s.headerButton}>
              <Image source={profile.photo || require("../../../assets/images/home/avatar.jpg")} style={s.avatar} />
            </Pressable>
          </View>
          <View style={s.search}>
            <FeedIcon name="search" size={17} />
            <TextInput accessibilityLabel="Search people and posts" value={query} onChangeText={setQuery} returnKeyType="search" placeholder="Search people, posts and more" placeholderTextColor="#656383" style={s.input} />
            <Pressable accessibilityLabel="Filter Explore" accessibilityRole="button" onPress={() => setPanel("Filter Explore")} style={s.filterButton}><Image source={require("../../../assets/images/explore/filter.png")} tintColor={accent} style={s.filterIcon} /></Pressable>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
            {categories.map(item => <Pressable key={item.name} accessibilityRole="button" accessibilityState={{ selected: category === item.name }} onPress={() => setCategory(item.name)} style={[s.chip, { minWidth: Math.max(65, (item.name === "Nature" || item.name === "People" ? 153 : 143) * u) }, category === item.name && s.purple]}>
              {item.icon && <Image source={item.icon} tintColor={category === item.name ? "#fff" : "#45455f"} style={s.chipIcon} />}
              <Text style={[s.chipText, category === item.name && s.white]}>{item.name}</Text>
            </Pressable>)}
          </ScrollView>
          {showPeople && <>
            <View style={s.sectionHeader}><Text style={s.heading}>Suggested People</Text><Pressable accessibilityRole="button" onPress={() => setPanel("Suggested People")}><Text style={s.seeAll}>See All</Text></Pressable></View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.people}>
              {suggested.map(person => <View key={person.name} style={[s.card, { width: Math.max(86, (person === people[0] ? 192 : 181) * u) }]}>
                <Image source={person.image} style={s.personImage} />
                <Text style={s.personName} numberOfLines={1} adjustsFontSizeToFit>{person.name}</Text>
                <Text style={s.followers} numberOfLines={1} adjustsFontSizeToFit>{person.followers} followers</Text>
                <Pressable accessibilityRole="button" accessibilityLabel={(following.includes(person.name) ? "Unfollow " : "Follow ") + person.name} onPress={() => toggle(person.name)} style={[s.follow, s.purple]}><Text style={s.followLabel}>{following.includes(person.name) ? "Following" : "Follow"}</Text></Pressable>
              </View>)}
            </ScrollView>
          </>}
          {!!matches.length && <>
            <View style={s.sectionHeader}><Text style={s.heading}>Trending Posts</Text></View>
            <View style={s.grid}>{[268, 254, 252].map((weight, col) => <View key={col} style={[s.column, { flex: weight }]}>
              {matches.filter((_, i) => i % 3 === col).map(tile => <Pressable key={tile.label} accessibilityRole="button" accessibilityLabel={tile.label} onPress={() => setPreview(tile)}>
                <Image source={tile.image} style={{ width: "100%", aspectRatio: tile.ratio, borderRadius: 11 }} />
              </Pressable>)}
            </View>)}</View>
          </>}
          {!matches.length && !showPeople && <Text style={s.empty}>No matching people or posts</Text>}
        </View>
      </ScrollView>
      <Modal visible={!!panel || !!preview} transparent animationType="fade" onRequestClose={close}>
        <View style={s.overlay}><View style={s.dialog}>
          <Text style={s.heading}>{preview?.label || panel}</Text>
          {preview && <Image source={preview.image} style={{ width: "100%", aspectRatio: preview.ratio, borderRadius: 12 }} />}
          {panel === "Notifications" && <Text>No new notifications</Text>}
          {panel === "Suggested People" && people.map(person => <View key={person.name} style={s.listRow}><Image source={person.image} style={s.avatar} /><Text style={s.personName}>{person.name}</Text><Pressable accessibilityRole="button" onPress={() => toggle(person.name)}><Text style={s.seeAll}>{following.includes(person.name) ? "Following" : "Follow"}</Text></Pressable></View>)}
          {panel === "Filter Explore" && categories.map(item => <Pressable key={item.name} onPress={() => { setCategory(item.name); close(); }} accessibilityRole="button" accessibilityState={{ selected: category === item.name }}><Text style={s.chipText}>{item.name}</Text></Pressable>)}
          <Pressable accessibilityRole="button" onPress={close}><Text style={s.seeAll}>Close</Text></Pressable>
        </View></View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f9f8fd", backgroundImage: "linear-gradient(155deg, #f4f1fb, #faf9fc 48%, #faf9fc)" },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 19, gap: 6, minHeight: 38 },
  logo: { width: 35, height: 35 }, brand: { flex: 1, fontSize: 28, fontWeight: "800", letterSpacing: -1.1, color: "#090912" },
  headerButton: { width: 41, height: 40, alignItems: "center", justifyContent: "center" }, avatar: { width: 35, height: 35, borderRadius: 20 }, bell: { width: 20, height: 20 }, dot: { position: "absolute", right: 7, top: 6, width: 8, height: 8, borderRadius: 5, backgroundColor: accent },
  search: { flexDirection: "row", alignItems: "center", paddingLeft: 15, gap: 10, marginHorizontal: 12, marginTop: 7, minHeight: 42, borderWidth: 0.7, borderColor: "#d9d2ff", borderRadius: 25, backgroundColor: "#ece9fa" },
  input: { flex: 1, minWidth: 0, fontSize: 14.5, color: "#141025", paddingVertical: 9 }, filterButton: { width: 42, height: 40, alignItems: "center", justifyContent: "center" }, filterIcon: { width: 18, height: 18 },
  chips: { flexDirection: "row", gap: 5, paddingLeft: 10, paddingRight: 6, paddingTop: 12 }, chip: { minHeight: 33, paddingHorizontal: 8, borderRadius: 20, backgroundColor: "#f2f0f9", borderWidth: 0.6, borderColor: "#dcd6fc", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5 }, chipIcon: { width: 13, height: 13 }, chipText: { fontSize: 12, color: "#12101c", fontWeight: "500" }, white: { color: "white" }, purple: { backgroundColor: accent, backgroundImage: "linear-gradient(170deg, #b169fb, #592aff)", borderWidth: 0 },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginHorizontal: 10, marginTop: 17, marginBottom: 9 }, heading: { color: "#0c0b18", fontSize: 17, fontWeight: "800", letterSpacing: -0.6 }, seeAll: { color: accent, fontSize: 13, fontWeight: "600" },
  people: { gap: 7, paddingHorizontal: 10, paddingVertical: 2, paddingBottom: 3 }, card: { alignItems: "center", paddingHorizontal: 6, paddingTop: 6, paddingBottom: 9, borderRadius: 15, backgroundColor: "#fbfafd", boxShadow: "0px 3px 8px #7955e629" }, personImage: { width: 56, height: 56, borderRadius: 28 }, personName: { marginTop: 3, fontSize: 12, fontWeight: "700", letterSpacing: -0.35, color: "#100f1b" }, followers: { fontSize: 10, marginTop: 3, color: "#4d4a6f" }, follow: { width: "92%", marginTop: 6, borderRadius: 18, minHeight: 24, alignItems: "center", justifyContent: "center" }, followLabel: { fontSize: 12, fontWeight: "500", color: "white" },
  grid: { flexDirection: "row", gap: 3, paddingHorizontal: 6 }, column: { gap: 4 }, empty: { textAlign: "center", padding: 24 }, overlay: { flex: 1, justifyContent: "center", padding: 24, backgroundColor: "#17132688" }, dialog: { alignSelf: "center", width: "100%", maxWidth: 400, backgroundColor: "white", padding: 20, borderRadius: 20, gap: 15 }, listRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 6 },
});
