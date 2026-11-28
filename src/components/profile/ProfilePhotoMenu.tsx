import * as ImagePicker from "expo-image-picker";
import { useFocusEffect } from "expo-router";
import { useCallback, useRef, useState, type ComponentRef } from "react";
import { Alert, BackHandler, Pressable, StyleSheet, Text, View } from "react-native";

export type PhotoSource = "Gallery" | "Camera";

export async function pickProfilePhoto(source: PhotoSource) {
  if (source === "Camera" && !(await ImagePicker.requestCameraPermissionsAsync()).granted) {
    Alert.alert("Camera access needed", "Allow camera access in Settings to take a profile photo.");
    return null;
  }
  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 0.85,
  };
  const result = source === "Camera"
    ? await ImagePicker.launchCameraAsync(options)
    : await ImagePicker.launchImageLibraryAsync(options);
  if (result.canceled || !result.assets[0]) return null;
  return result.assets[0];
}

export function useProfilePhotoMenu() {
  const screen = useRef<ComponentRef<typeof View>>(null);
  const badge = useRef<ComponentRef<typeof View>>(null);
  const [menu, setMenu] = useState<{ left: number; top: number } | null>(null);
  useFocusEffect(useCallback(() => () => setMenu(null), []));
  useFocusEffect(useCallback(() => {
    if (!menu) return;
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      setMenu(null);
      return true;
    });
    return () => subscription.remove();
  }, [menu]));

  function openPhotoMenu() {
    const parent = screen.current;
    if (!parent) return;
    badge.current?.measureLayout(parent, (x, y, w, h) => {
      parent.measure((_x, _y, width, height) => {
        setMenu({
          left: Math.max(8, Math.min(x + w / 2, width - 164)),
          top: y + h + 108 <= height ? y + h + 4 : Math.max(8, y - 104),
        });
      });
    });
  }

  return { screenRef: screen, badgeRef: badge, menu, openPhotoMenu, close: () => setMenu(null) };
}

export function ProfilePhotoMenu({ menu, close, onChoose }: {
  menu: { top: number; left: number } | null;
  close: () => void;
  onChoose: (source: PhotoSource) => void;
}) {
  if (!menu) return null;
  return (
    <View style={StyleSheet.absoluteFill} accessibilityViewIsModal>
        <Pressable accessibilityRole="button" accessibilityLabel="Dismiss photo menu" onPress={close} style={StyleSheet.absoluteFill} />
        <View style={[s.photoMenu, menu]}>
          {(["Gallery", "Camera"] as const).map(source => (
            <Pressable key={source} accessibilityRole="button" onPress={() => { close(); onChoose(source); }} style={s.photoOption}>
              <Text style={s.actionLabel}>{source}</Text>
            </Pressable>
          ))}
        </View>
      </View>
  );
}

const s = StyleSheet.create({
  photoMenu: { position: "absolute", width: 156, padding: 5, borderRadius: 15, backgroundColor: "white", boxShadow: "0px 4px 18px #20163530" },
  photoOption: { minHeight: 44, justifyContent: "center", paddingHorizontal: 12 },
  actionLabel: { color: "#171126", fontSize: 16 },
});
