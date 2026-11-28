import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { uploadMedia } from "../components/social/upload";
import { useUser } from "@clerk/expo";
import { Image } from "expo-image";
import { pickProfilePhoto, ProfilePhotoMenu, useProfilePhotoMenu, type PhotoSource } from "../components/profile/ProfilePhotoMenu";
import type * as ImagePicker from "expo-image-picker";
import { Redirect, router, usePreventRemove } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useRef, useState } from "react";
import { ActivityIndicator, Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FeedIcon } from "../components/home/FeedIcon";
import { defaultPortrait, useSessionProfile, type Profile } from "../components/profile/SessionProfile";

export default function EditProfileScreen() {
  const { isLoaded, isSignedIn } = useUser();
  if (!isLoaded) return <ActivityIndicator style={{ flex: 1 }} />;
  if (!isSignedIn) return <Redirect href="/auth" />;
  return <Editor />;
}

function Editor() {
  const { profile, save } = useSessionProfile();
  const [draft, setDraft] = useState(profile);
  const [submitted, setSubmitted] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const beginUpload = useMutation(api.social.beginUpload);
  const setProfilePhoto = useMutation(api.social.setProfilePhoto);
  const [selected, setSelected] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const saving = useRef(false);
  const [busy, setBusy] = useState(false);
  const { screenRef, badgeRef, menu, close, openPhotoMenu } = useProfilePhotoMenu();
  const picking = useRef(false);
  const pendingExit = useRef<() => void>(() => {});
  const insets = useSafeAreaInsets();
  const dirty = (Object.keys(profile) as (keyof Profile)[]).some(key => key === "photo" ? !!selected : draft[key] !== profile[key]);
  const disableGuard = usePreventRemove(dirty && !leaving, ({ repeat }) => {
    Keyboard.dismiss();
    pendingExit.current = repeat;
    setConfirm(true);
  });
  const validHandle = /^[a-zA-Z0-9_]{1,30}$/.test(draft.handle.trim());
  const validName = !!draft.name.trim();
  function back() {
    if (router.canGoBack()) router.back();
    else router.replace("/account");
  }
  function field<K extends keyof Profile>(key: K, value: Profile[K]) {
    setDraft(current => ({ ...current, [key]: value }));
  }
  async function pickPhoto(source: PhotoSource) {
    if (picking.current) return;
    picking.current = true;
    setPhotoError("");
    try {
      const asset = await pickProfilePhoto(source);
      if (asset) {
        setSelected(asset);
        field("photo", asset.uri);
      }
    } catch {
      setPhotoError("Couldn’t open that photo. Try choosing it again.");
    } finally {
      picking.current = false;
    }
  }
  async function commit() {
    setSubmitted(true);
    if (!validName || !validHandle || draft.bio.length > 160) return;
    if (saving.current || picking.current) return;
    saving.current = true;
    setBusy(true);
    setPhotoError("");
    Keyboard.dismiss();
    try {
      if (selected) {
        const file = await uploadMedia(selected, beginUpload, () => {});
        await setProfilePhoto(file);
      }
    } catch {
      setPhotoError("Couldn’t save your profile photo. Please try again.");
      return;
    } finally {
      saving.current = false;
      setBusy(false);
    }
    disableGuard();
    setLeaving(true);
    save({ ...draft, name: draft.name.trim(), handle: draft.handle.trim(), bio: draft.bio.trim() });
    back();
  }
  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={s.screen}>
      <View ref={screenRef} collapsable={false} style={s.screen}>
      <StatusBar style="dark" />
      <Image source={require("../../assets/images/profile/editor-background.svg")} contentFit="fill" style={StyleSheet.absoluteFill} />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[s.scroll, { paddingTop: insets.top, paddingBottom: insets.bottom + 26 }]}>
        <View style={s.page}>
          <View style={s.header}>
            <Pressable accessibilityRole="button" accessibilityLabel="Back to profile" onPress={back} style={s.back}><Text style={s.chevron}>‹</Text></Pressable>
            <Text accessibilityRole="header" style={s.title}>Edit Profile</Text>
          </View>
          <Pressable accessibilityLabel="Choose profile photo" accessibilityRole="button" ref={badgeRef} accessibilityState={{ expanded: !!menu }} disabled={busy} onPress={openPhotoMenu} style={s.ring}>
            <Image source={(selected ? draft.photo : profile.photo) || defaultPortrait} style={s.avatar} />
            <Image source={require("../../assets/images/profile/camera.png")} style={s.camera} />
          </Pressable>
          {!!photoError && <Text accessibilityRole="alert" style={s.error}>{photoError}</Text>}
          {(["name", "handle", "bio"] as const).map(key => {
            const label = { name: "Name", handle: "Username", bio: "Bio" }[key];
            return <View key={key} style={s.group}>
              <View style={s.labelRow}>
                {key === "name" ? <FeedIcon name="profile" color="#8750ff" size={20} /> : <Text style={s.symbol}>{key === "handle" ? "@" : "☷"}</Text>}
                <Text style={s.label}>{label}</Text>
              </View>
              <View style={s.field}>
                <TextInput accessibilityLabel={label} value={draft[key]} onChangeText={value => field(key, value)} autoCapitalize={key === "handle" ? "none" : "sentences"} autoCorrect={key !== "handle"} multiline={key === "bio"} maxLength={key === "bio" ? 160 : key === "handle" ? 30 : undefined} style={[s.input, key === "bio" && s.bio, key === "handle" && { paddingRight: 41 }]} />
                {key === "handle" && validHandle && <Text accessible={false} style={s.check}>✓</Text>}
              </View>
              {submitted && key === "name" && !validName && <Text accessibilityRole="alert" style={s.error}>Enter a name.</Text>}
              {submitted && key === "handle" && !validHandle && <Text accessibilityRole="alert" style={s.error}>Use 1–30 letters, numbers, or underscores.</Text>}
              {key === "bio" && <Text style={s.counter}>{draft.bio.length} / 160</Text>}
            </View>;
          })}
          <Pressable disabled={busy} onPress={commit} accessibilityRole="button" style={s.save}><Text style={s.saveText}>{busy ? "Saving…" : "Save Changes"}</Text></Pressable>
        </View>
      </ScrollView>
      <ProfilePhotoMenu menu={menu} close={close} onChoose={pickPhoto} />
      <Modal visible={confirm} transparent animationType="fade" onRequestClose={() => setConfirm(false)}>
        <View style={s.overlay}><View style={s.dialog}>
          <Text style={s.title}>Discard changes?</Text>
          <Text>Your edits haven’t been saved.</Text>
          <Pressable accessibilityRole="button" style={s.choice} onPress={() => setConfirm(false)}><Text style={s.label}>Keep editing</Text></Pressable>
          <Pressable accessibilityRole="button" style={s.choice} onPress={() => { setConfirm(false); setLeaving(true); disableGuard(); pendingExit.current(); }}><Text style={s.error}>Discard changes</Text></Pressable>
        </View></View>
      </Modal>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f8f6fd" }, scroll: { flexGrow: 1, alignItems: "center" }, page: { width: "100%", maxWidth: 485, paddingHorizontal: 22 },
  header: { alignItems: "center", justifyContent: "center", minHeight: 44 }, back: { position: "absolute", left: 0, width: 41, height: 41, borderWidth: 1, borderColor: "#ded9f9", borderRadius: 13, backgroundColor: "#efecfb", justifyContent: "center", alignItems: "center" },
  chevron: { fontSize: 34, lineHeight: 36, color: "#101226", marginTop: -4 }, title: { color: "#101124", fontSize: 23, fontWeight: "700", letterSpacing: -0.65 },
  ring: { width: "47%", aspectRatio: 1, alignSelf: "center", marginTop: 20, marginBottom: 8, borderRadius: 120, borderWidth: 3, borderColor: "#9053ff", padding: 3, backgroundColor: "#fff" }, avatar: { width: "100%", height: "100%", borderRadius: 120 }, camera: { width: "31%", aspectRatio: 1, borderRadius: 36, position: "absolute", right: 1, bottom: 0 },
  group: { marginTop: 24 }, labelRow: { flexDirection: "row", alignItems: "center", gap: 8, minHeight: 26, paddingLeft: 7, marginBottom: 6 }, label: { color: "#13142a", fontWeight: "600", fontSize: 16 }, symbol: { fontSize: 21, color: "#8750ff", fontWeight: "600" },
  field: { justifyContent: "center" }, input: { color: "#15131b", fontSize: 17, minHeight: 48, paddingHorizontal: 16, paddingVertical: 11, borderWidth: 1, borderColor: "#d9d5ed", borderRadius: 15, backgroundColor: "#fbfaff60" }, bio: { textAlignVertical: "top", minHeight: 86, fontSize: 15.5 }, check: { position: "absolute", right: 14, borderRadius: 10, overflow: "hidden", backgroundColor: "#23c872", color: "white", width: 18, height: 18, lineHeight: 18, textAlign: "center", fontWeight: "700" },
  counter: { textAlign: "right", color: "#6b6885", fontSize: 13, marginTop: 6 }, save: { marginTop: 37, minHeight: 49, alignItems: "center", justifyContent: "center", borderRadius: 32, backgroundColor: "#793bff", backgroundImage: "linear-gradient(167deg, #bc77ff, #884cf8 40%, #5b30ff)" }, saveText: { color: "#fff", fontSize: 17, fontWeight: "600" },
  error: { color: "#a12843", fontSize: 14, marginTop: 4 }, overlay: { flex: 1, justifyContent: "center", padding: 25, backgroundColor: "#19162b80" }, dialog: { backgroundColor: "white", borderRadius: 20, padding: 22, gap: 10, maxWidth: 400, width: "100%", alignSelf: "center" }, choice: { minHeight: 44, justifyContent: "center" },
});
