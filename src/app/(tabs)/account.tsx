import { useAuth, useUser } from "@clerk/expo";
import { Image } from "expo-image";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { Button, Modal, Pressable, ScrollView, Share, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { accent, FeedIcon } from "../../components/home/FeedIcon";
import { usePaginatedQuery, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { SavedPostLink } from "../../components/social/SavedPostLink";
import { useSocialSession } from "../../components/social/SocialSession";
import { PostDialog } from "../../components/social/PostDialog";
import { PostTile } from "../../components/social/PostTile";
import { useSavedPosts } from "../../components/home/SavedPosts";
import { highlights, photos, sections } from "../../components/profile/media";

import { router } from "expo-router";
import { useSessionProfile } from "../../components/profile/SessionProfile";

const icons = {
  settings: require("../../../assets/images/profile/settings.svg"),
  bell: require("../../../assets/images/profile/bell.png"),
  share: require("../../../assets/images/profile/share.png"),
  pencil: require("../../../assets/images/profile/pencil.png"),
};

export default function AccountScreen() {
  const { user } = useUser();
  const saved = useSavedPosts();
  const { signOut } = useAuth();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const page = Math.min(width - insets.left - insets.right, 550);
  const unit = page / 814;
  const portrait = 240 * unit;
  const cover = Math.max(406 * unit, insets.top + 132);
  const { profile: { name, handle, bio, photo: portraitUri } } = useSessionProfile();
  const [section, setSection] = useState<string>("Posts");
  const [panel, setPanel] = useState("");
  const [photo, setPhoto] = useState<(typeof photos)[number]>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  function open(panelName: string) {
    setError("");
    setPhoto(undefined);
    setPanel(panelName);
  }
  function preview(item: (typeof photos)[number]) {
    open(item.label);
    setPhoto(item);
  }
  async function submit() {
    setBusy(true);
    setError("");
    try {
      await signOut();
      setPanel("");
    } catch {
      setError("Could not finish. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  const connection = useSocialSession();
  const me = useQuery(api.social.me, connection.ready ? {} : "skip");
  const mine = usePaginatedQuery(api.social.feed, connection.ready ? { scope: "mine" } : "skip", { initialNumItems: 18 });
  const [postId, setPostId] = useState<Id<"posts">>();
  const stats = [[String(me?.posts ?? "…"), "Posts"], [String(me?.followers ?? "…"), "Followers"], [String(me?.followingCount ?? "…"), "Following"]];
  return (
    <View style={s.screen}>
      <StatusBar style="dark" />
      <ScrollView contentInsetAdjustmentBehavior="never" showsVerticalScrollIndicator={false} contentContainerStyle={{ alignItems: "center", paddingBottom: insets.bottom + 86 }}>
        <View style={{ width: page }}>
          <Image source={require("../../../assets/images/profile/cover.jpg")} style={{ width: page, height: cover + 25 }} contentFit="fill" />
          <View style={[s.header, { top: Math.max(50 * unit, insets.top), left: 46 * unit, right: 43 * unit }]}>
            <Image source={require("../../../assets/images/snaply-launch-mark.png")} style={s.logo} />
            <Text style={s.brand}>Snaply</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Notifications" style={s.round} onPress={() => open("Notifications")}>
              <Image source={icons.bell} tintColor="#101016" style={s.icon} /><View style={s.dot} />
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Settings" style={s.round} onPress={() => open("Account")}>
              <Image source={icons.settings} style={s.icon} />
            </Pressable>
          </View>
          <View style={s.sheet}>
            <View style={[s.stats, { marginLeft: 305 * unit, minHeight: 145 * unit }]}>
              {stats.map(([value, label], i) => <View key={label} style={[s.stat, i > 0 && s.divider]}><Text style={s.number}>{value}</Text><Text style={s.statLabel}>{label}</Text></View>)}
            </View>
            <View style={[s.avatarFrame, { top: -90 * unit, left: 36 * unit, width: portrait, height: portrait, borderRadius: portrait / 2 }]}>
              <Image source={portraitUri || require("../../../assets/images/profile/portrait.jpg")} style={s.avatar} />
              <View style={s.badge}><Text style={s.badgeText}>+</Text></View>
            </View>
            <View style={s.details}>
              <Text accessibilityRole="header" style={s.name}>{name}{user?.publicMetadata.verified === true && <Text style={{ color: accent }}> ✔</Text>}</Text>
              <Text style={s.handle}>@{handle}</Text>
              <Text style={s.bio}>{bio}</Text>
              <View style={s.actions}>
                <Pressable accessibilityRole="button" style={[s.action, s.edit]} onPress={() => router.push("/edit-profile")}>
                  <Image source={icons.pencil} tintColor={accent} style={s.smallIcon} /><Text style={s.editLabel}>Edit Profile</Text>
                </Pressable>
                <Pressable accessibilityRole="button" accessibilityLabel="Share profile" style={s.action} onPress={() => Share.share({ message: name + " (@" + handle + ") on Snaply\n" + bio })}><Image source={icons.share} tintColor="#101016" style={s.smallIcon} /></Pressable>
                <Pressable accessibilityRole="button" accessibilityLabel="Saved posts" style={s.action} onPress={() => open("Saved posts")}><FeedIcon name="bookmark" size={17} /></Pressable>
              </View>
            </View>
            <View style={s.highlights}>
              {[{ label: "New", image: null }, ...highlights].map(item => (
                <Pressable key={item.label} accessibilityRole="button" onPress={() => item.image ? preview(item) : open("New highlight")} style={s.highlight}>
                  <View style={[s.ring, { width: 113 * unit, height: 113 * unit }]}>{item.image ? <Image source={item.image} style={s.avatar} /> : <View style={s.newCircle}><Text style={s.newText}>＋</Text></View>}</View>
                  <Text style={s.highlightLabel}>{item.label}</Text>
                </Pressable>
              ))}
            </View>
            <View style={s.tabs} accessibilityRole="tablist">
              {sections.map(item => <Pressable key={item.label} accessibilityRole="tab" accessibilityState={{ selected: section === item.label }} style={s.tab} onPress={() => setSection(item.label)}>
                <Image source={item.icon} style={s.icon} tintColor={section === item.label ? accent : "#596071"} /><Text style={[s.tabLabel, section === item.label && { color: accent }]}>{item.label}</Text>{section === item.label && <View style={s.line} />}
              </Pressable>)}
            </View>
            {section === "Posts" ? <>
              <View style={s.grid}>{mine.results.map(post => <PostTile key={post.id} post={post} width={Math.floor((page - 20) / 3)} onPress={() => setPostId(post.id)} />)}</View>
              {!mine.results.length && <Text style={s.empty}>{!connection.ready ? connection.message : mine.status === "LoadingFirstPage" ? "Loading posts…" : "No posts yet"}</Text>}
              {mine.status === "CanLoadMore" && <Button title="More posts" onPress={() => mine.loadMore(18)} />}
            </> : <Text style={s.empty}>{section === "Reels" ? "No reels yet" : "No tagged posts yet"}</Text>}
          </View>
        </View>
      </ScrollView>
      {connection.ready && postId && <PostDialog showPost postId={postId} close={() => setPostId(undefined)} />}
      <Modal visible={!!panel} transparent animationType="fade" onRequestClose={() => setPanel("")}>
        <View style={s.backdrop}><View style={s.dialog}>
          <Text style={s.name}>{panel}</Text>
          {photo && <Image source={photo.image} style={s.preview} />}
          {panel === "Account" && <Text>{user?.primaryEmailAddress?.emailAddress}</Text>}
          {panel === "Account" && <Pressable accessibilityRole="button" disabled={busy} onPress={submit}><Text style={s.editLabel}>{busy ? "Please wait…" : "Sign out"}</Text></Pressable>}
          {panel === "Notifications" && <Text>No new notifications</Text>}
          {connection.ready && panel === "Saved posts" && (saved.ids.length === 0 ? <Text>Your saved collection is empty.</Text> :
            saved.ids.map(id => <SavedPostLink key={id} id={id} open={() => { setPanel(""); setPostId(id); }} />))}
          {panel === "New highlight" && <Text>Add a story to create a highlight.</Text>}
          {!!error && <Text accessibilityRole="alert">{error}</Text>}
          <Pressable accessibilityRole="button" onPress={() => setPanel("")}><Text style={s.handle}>Close</Text></Pressable>
        </View></View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#fff" },
  header: { position: "absolute", flexDirection: "row", alignItems: "center", gap: 8 },
  logo: { width: 32, height: 32 }, brand: { flex: 1, fontWeight: "700", fontSize: 26, letterSpacing: -1, color: "#10101b" },
  round: { width: 35, height: 35, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: "#ffffffa6" },
  dot: { position: "absolute", top: 6, right: 6, backgroundColor: accent, width: 7, height: 7, borderRadius: 4 },
  icon: { height: 19, width: 19 }, smallIcon: { width: 17, height: 17 },
  sheet: { marginTop: -25, backgroundColor: "white", borderTopLeftRadius: 25, borderTopRightRadius: 25 },
  stats: { flexDirection: "row", alignItems: "center", paddingRight: 7 }, stat: { flex: 1, alignItems: "center" }, divider: { borderLeftColor: "#d8dae4", borderLeftWidth: 1 },
  number: { fontWeight: "700", fontSize: 18, color: "#0c1020" }, statLabel: { fontSize: 13, color: "#54596b" },
  avatarFrame: { position: "absolute", borderWidth: 2.5, borderColor: "white", backgroundColor: "white" },
  avatar: { width: "100%", height: "100%", borderRadius: 150 },
  badge: { position: "absolute", bottom: 2, right: 3, width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: "#fff", backgroundColor: "#5028ff", alignItems: "center", justifyContent: "center" },
  badgeText: { color: "white", fontSize: 22, lineHeight: 24 },
  details: { paddingHorizontal: 19, paddingTop: 8 },
  name: { color: "#0b1020", fontSize: 21, fontWeight: "700", letterSpacing: -0.6 },
  handle: { fontSize: 13, color: "#52586b", fontWeight: "500", marginTop: 2 },
  bio: { color: "#101119", fontSize: 13, lineHeight: 16, letterSpacing: -0.3, marginTop: 5 },
  actions: { flexDirection: "row", gap: 10, marginTop: 13 },
  action: { minHeight: 35, width: 50, borderWidth: 1, borderColor: "#dadce8", borderRadius: 22, justifyContent: "center", alignItems: "center", flexDirection: "row", gap: 7 },
  edit: { flex: 1, borderWidth: 0, backgroundColor: "#ece8ff" }, editLabel: { color: "#5c29fc", fontSize: 14, fontWeight: "600" },
  highlights: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 17, marginTop: 12 },
  highlight: { alignItems: "center", gap: 3 }, ring: { padding: 3, borderWidth: 1, borderColor: "#dee0e9", borderRadius: 80 },
  newCircle: { flex: 1, borderRadius: 60, alignItems: "center", justifyContent: "center", backgroundColor: "#ece8ff" }, newText: { color: "#6034fa", fontSize: 24 },
  highlightLabel: { fontSize: 11, color: "#17171b" },
  tabs: { flexDirection: "row", marginTop: 7, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: "#dee0ea" },
  tab: { flex: 1, minHeight: 42, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 6 },
  tabLabel: { fontSize: 14, fontWeight: "600", color: "#596071" }, line: { position: "absolute", bottom: 0, height: 3, width: "78%", backgroundColor: "#6232ff", borderRadius: 2 },
  grid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 6, paddingTop: 9, gap: 4 }, tile: { width: "100%", height: "100%", borderRadius: 8 },
  empty: { textAlign: "center", padding: 24 }, backdrop: { flex: 1, justifyContent: "center", padding: 24, backgroundColor: "#17152690" }, dialog: { width: "100%", maxWidth: 420, alignSelf: "center", padding: 20, borderRadius: 20, backgroundColor: "white", gap: 14 },
  input: { padding: 12, minHeight: 80, borderRadius: 12, backgroundColor: "#f4f2fa", color: "#111" }, preview: { width: "100%", aspectRatio: 1.25, borderRadius: 10 },
});
