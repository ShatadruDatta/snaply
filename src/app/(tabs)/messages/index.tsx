import { Image } from "expo-image";
import { StatusBar } from "expo-status-bar";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { router } from "expo-router";
import { conversations } from "../../../components/messages/conversations";
import { useThreads } from "../../../components/messages/Threads";

export default function MessagesScreen() {
  const { threads, opened } = useThreads();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.screen, { paddingTop: insets.top, paddingLeft: insets.left, paddingRight: insets.right }]}>
      <StatusBar style="dark" />
      <ScrollView contentInsetAdjustmentBehavior="never" contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text accessibilityRole="header" style={styles.title}>Messages</Text>
          <Image source={require("../../../../assets/images/messages/chat.png")} style={styles.icon} />
        </View>
        {conversations.map(({ name, avatar, preview, time, unread }) => {
          const latest = threads[name]?.at(-1);
          const snippet = latest?.text || (latest?.photo ? "Photo" : preview);
          const hasUnread = !!unread && !opened.includes(name);
          return (
          <Pressable key={name} onPress={() => router.push({ pathname: "/messages/[handle]", params: { handle: name } })} accessibilityRole="button" accessibilityLabel={`${name}, ${snippet}, ${latest ? "now" : time}${hasUnread ? ", one unread message" : ""}`} style={styles.row}>
            <Image source={avatar} style={styles.avatar} />
            <View style={styles.details}>
              <Text style={styles.name}>{name}</Text>
              <Text numberOfLines={1} style={styles.preview}>{snippet}  ·  {latest ? "now" : time}</Text>
            </View>
            {hasUnread && <View style={styles.badge}><Text style={styles.count}>{unread}</Text></View>}
          </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f9f8fd",
    backgroundImage: "linear-gradient(105deg, #fcfbfd, #f4f3fc)",
  },
  content: { width: "100%", maxWidth: 550, alignSelf: "center", paddingHorizontal: 18, paddingTop: 12, paddingBottom: 88 },
  header: { minHeight: 46, flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 18 },
  title: { fontSize: 34, fontWeight: "700", letterSpacing: -1.1, color: "#080809" },
  icon: { width: 28, height: 27 },
  row: { flexDirection: "row", alignItems: "center", gap: 17, minHeight: 88.5, paddingVertical: 10 },
  avatar: { width: 65.5, height: 65.5, borderRadius: 33 },
  details: { flex: 1, gap: 4 },
  name: { fontSize: 20, fontWeight: "700", letterSpacing: -0.45, color: "#090909" },
  preview: { fontSize: 16, letterSpacing: -0.25, color: "#42475a" },
  badge: { minWidth: 25, minHeight: 25, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: "#7735ff" },
  count: { color: "#fff", fontSize: 14, fontWeight: "600" },
});
