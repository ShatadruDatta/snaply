import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import { router, usePathname } from "expo-router";
import { Tabs, TabList, TabSlot, TabTrigger, type TabTriggerSlotProps } from "expo-router/ui";
import { createContext, useContext, useEffect, useRef, useState, type ComponentPropsWithRef, type ComponentRef } from "react";
import { Keyboard, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { accent, FeedIcon, type IconName } from "../home/FeedIcon";

const tabs = [
  { name: "home", href: "/home", label: "Home", icon: "home" },
  { name: "explore", href: "/explore", label: "Explore", icon: "explore" },
  { name: "create", href: "/create", label: "Create", icon: "create" },
  { name: "messages", href: "/messages", label: "Messages", icon: "messages" },
  { name: "account", href: "/account", label: "Profile", icon: "profile" },
] as const;

const barHeight = 62;
const bottomGap = 8;
const radius = barHeight / 2;
const liquidGlass = Platform.OS === "ios" && isLiquidGlassAvailable();
const androidFrost = Platform.OS === "android" && Platform.Version >= 31
  && Boolean(globalThis.expo?.getViewConfig?.("ExpoBlur", "ExpoBlurTargetView"))
  && Boolean(globalThis.expo?.getViewConfig?.("ExpoBlur", "ExpoBlurView"));

// Existing Android builds may predate expo-blur. Only load its native views when registered.
const blur: typeof import("expo-blur") | undefined = androidFrost || Platform.OS !== "android"
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- A static import registers native views at startup.
  ? require("expo-blur")
  : undefined;
const Scene = androidFrost && blur ? blur.BlurTargetView : View;
const BlurSurface = blur?.BlurView;
const TabBarClearance = createContext(0);

export function useTabBarClearance() {
  return useContext(TabBarClearance);
}

export function GlassTabs() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const blurTarget = useRef<ComponentRef<typeof View>>(null);
  const [keyboardVisible, setKeyboardVisible] = useState(() => Keyboard.isVisible());

  useEffect(() => {
    const show = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      () => setKeyboardVisible(true),
    );
    const hide = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => setKeyboardVisible(false),
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const showBar = !keyboardVisible && pathname !== "/create" && pathname !== "/explore/suggested-people";
  const bottom = insets.bottom + bottomGap;
  const clearance = showBar ? bottom + barHeight : 0;
  const inConversation = pathname.startsWith("/messages/");

  return (
    <TabBarClearance.Provider value={clearance}>
      <Tabs options={{ backBehavior: "initialRoute" }}>
        <Scene ref={blurTarget} style={styles.scene}>
          <TabSlot />
        </Scene>
        {showBar && (
          <View
            pointerEvents="box-none"
            style={[styles.position, { bottom, left: insets.left + 12, right: insets.right + 12 }]}
          >
            <View accessibilityRole="tablist" style={styles.bar}>
              {liquidGlass ? (
                <GlassView pointerEvents="none" colorScheme="light" tintColor="#fbf9ffb8" style={styles.surface} />
              ) : BlurSurface ? (
                <BlurSurface
                  pointerEvents="none"
                  blurTarget={androidFrost ? blurTarget : undefined}
                  blurMethod={androidFrost ? "dimezisBlurViewSdk31Plus" : "none"}
                  intensity={70}
                  tint="light"
                  style={styles.surface}
                />
              ) : null}
              <View pointerEvents="none" style={[styles.surface, styles.frostedTint]} />
              {tabs.map(({ name, icon, label }) => (
                <TabTrigger
                  key={name}
                  name={name}
                  asChild
                  onPress={name === "messages" && inConversation ? () => router.dismissTo("/messages") : undefined}
                >
                  <TabButton icon={icon} label={label} />
                </TabTrigger>
              ))}
            </View>
          </View>
        )}
        <TabList style={styles.hidden}>
          {tabs.map(({ name, href }) => <TabTrigger key={name} name={name} href={href} />)}
        </TabList>
      </Tabs>
    </TabBarClearance.Provider>
  );
}

type TabButtonProps = ComponentPropsWithRef<typeof Pressable> & Pick<TabTriggerSlotProps, "href" | "isFocused"> & {
  icon: IconName;
  label: string;
};

function TabButton({ icon, label, isFocused, ...props }: TabButtonProps) {
  const color = isFocused ? accent : "#262439";
  return (
    <Pressable
      {...props}
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected: isFocused }}
      style={({ pressed }) => [styles.button, isFocused && styles.selected, pressed && styles.pressed]}
    >
      <FeedIcon name={icon} size={22} color={color} />
      <Text numberOfLines={1} maxFontSizeMultiplier={1.25} style={[styles.label, { color }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scene: { flex: 1 },
  position: { position: "absolute", alignItems: "center" },
  bar: {
    width: "100%",
    maxWidth: 500,
    height: barHeight,
    borderRadius: radius,
    flexDirection: "row",
    padding: 5,
    gap: 2,
    boxShadow: "0px 4px 18px #21154426",
  },
  surface: { ...StyleSheet.absoluteFill, borderRadius: radius, overflow: "hidden" },
  frostedTint: {
    backgroundColor: Platform.OS === "android" && !androidFrost ? "#fbf9ffe6" : "#fbf9ffad",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#ffffffed",
  },
  button: { flex: 1, minWidth: 0, alignItems: "center", justifyContent: "center", gap: 3, borderRadius: 26 },
  selected: { backgroundColor: "#ece3fce6" },
  pressed: { opacity: 0.7 },
  label: { fontSize: 11, fontWeight: "600" },
  hidden: { display: "none" },
});
