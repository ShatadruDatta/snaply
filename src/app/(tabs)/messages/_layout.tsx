import { router, Stack } from "expo-router";
import { useEffect, useState } from "react";
import { Keyboard, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { accent, FeedIcon } from "../../../components/home/FeedIcon";

export const unstable_settings = { initialRouteName: "index" };
const tabs = [
  { label: "Home", icon: "home", href: "/home" },
  { label: "Explore", icon: "explore", href: "/explore" },
  { label: "Create", icon: "create", href: "/create" },
  { label: "Messages", icon: "messages", href: "/messages" },
  { label: "Profile", icon: "profile", href: "/account" },
] as const;

export default function MessagesLayout() {
  const insets = useSafeAreaInsets();
  const [keyboard, setKeyboard] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      () => setKeyboard(true),
    );
    const hide = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => setKeyboard(false),
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return (
    <View style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }} />
      {!keyboard && (
        <View
          accessibilityRole="tablist"
          style={[
            s.bar,
            { paddingBottom: insets.bottom, paddingLeft: insets.left, paddingRight: insets.right },
          ]}
        >
          {tabs.map((tab) => {
            const active = tab.icon === "messages";
            const color = active ? accent : "#353a56";
            return (
              <Pressable
                key={tab.href}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                onPress={() => router.navigate(tab.href)}
                style={s.tab}
              >
                <FeedIcon name={tab.icon} size={25} color={color} />
                <Text style={[s.label, { color }]}>{tab.label}</Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  bar: {
    flexDirection: "row",
    backgroundColor: "#fcfbff",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: "#dedbe9",
  },
  tab: { flex: 1, alignItems: "center", justifyContent: "center", minHeight: 57, gap: 3 },
  label: { fontSize: 12, fontWeight: "500" },
});
