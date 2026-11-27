import { useMutation } from "convex/react";
import { ConvexError } from "convex/values";
import { api } from "../../../convex/_generated/api";
import { useSocialSession } from "../../components/social/SocialSession";
import { PostVideo } from "../../components/social/PostVideo";
import { uploadMedia } from "../../components/social/upload";
import { Image } from "expo-image";
import { type ImagePickerAsset, launchCameraAsync, launchImageLibraryAsync, requestCameraPermissionsAsync } from "expo-image-picker";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useRef, useState } from "react";
import { ActionSheetIOS, Alert, Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const captionLimit = 500;

export default function CreateScreen() {
  const insets = useSafeAreaInsets();
  const [caption, setCaption] = useState("");
  const [photo, setPhoto] = useState<ImagePickerAsset>();
  const [webChooserOpen, setWebChooserOpen] = useState(false);
  const picking = useRef(false);
  const [message, setMessage] = useState("");

  const connection = useSocialSession();
  const beginUpload = useMutation(api.social.beginUpload);
  const publishPost = useMutation(api.social.publish);
  const uploaded = useRef<Awaited<ReturnType<typeof uploadMedia>> | undefined>(undefined);
  const sending = useRef(false);
  const [progress, setProgress] = useState<number | null>(null);
  const busy = progress !== null;

  async function publish() {
    if (!photo || sending.current) return;
    if (!connection.ready) {
      setMessage(connection.message);
      return;
    }
    sending.current = true;
    Keyboard.dismiss();
    setMessage("");
    setProgress(0);
    try {
      uploaded.current ??= await uploadMedia(photo, beginUpload, setProgress);
      await publishPost({ ...uploaded.current, caption: caption.trim() });
      removeMedia();
      setCaption("");
      router.replace("/home");
    } catch (error) {
      setMessage(error instanceof ConvexError ? String(error.data) :
        error instanceof Error && !error.message.includes("[CONVEX") ? error.message : "Couldn’t publish. Tap Publish to retry.");
    } finally {
      sending.current = false;
      setProgress(null);
    }
  }

  function removeMedia() {
    uploaded.current = undefined;
    setPhoto(undefined);
    setMessage("");
  }

  async function choosePhoto(source: "gallery" | "camera") {
    if (picking.current) return;
    picking.current = true;
    setWebChooserOpen(false);
    setMessage("");
    try {
      if (source === "camera" && Platform.OS !== "web") {
        const permission = await requestCameraPermissionsAsync();
        if (!permission.granted) {
          setMessage("Allow camera access to take a photo, or choose one from Gallery.");
          return;
        }
      }
      const launch = source === "camera" ? launchCameraAsync : launchImageLibraryAsync;
      const result = await launch({ mediaTypes: source === "gallery" ? ["images", "videos"] : ["images"], quality: 0.9 });
      if (!result.canceled) {
        const asset = result.assets[0];
        if (asset.type === "video" && (!asset.duration || asset.duration > 60000)) {
          setMessage("Choose a video up to 60 seconds long.");
        } else if ((asset.fileSize ?? 0) > 100 * 1024 * 1024) {
          setMessage("Choose a file of 100 MB or less.");
        } else {
          setPhoto(asset);
        }
      }
    } catch {
      setMessage(source === "camera" ? "Camera unavailable. You can choose a photo from Gallery." : "Couldn’t open Gallery. Please try again.");
    } finally {
      picking.current = false;
    }
  }

  function openPhotoSources() {
    if (picking.current) return;
    Keyboard.dismiss();
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        { title: "Choose a photo", options: ["Gallery", "Camera", "Cancel"], cancelButtonIndex: 2 },
        index => {
          if (index === 0) void choosePhoto("gallery");
          if (index === 1) void choosePhoto("camera");
        },
      );
    } else if (Platform.OS === "android") {
      Alert.alert("Choose a photo", undefined, [
        { text: "Cancel", style: "cancel" },
        { text: "Gallery", onPress: () => choosePhoto("gallery") },
        { text: "Camera", onPress: () => choosePhoto("camera") },
      ], { cancelable: true });
    } else {
      setWebChooserOpen(true);
    }
  }

  return (
    <KeyboardAvoidingView style={s.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <StatusBar style="dark" />
      <Image source={require("../../../assets/images/create/background.svg")} style={StyleSheet.absoluteFill} contentFit="fill" />
      <ScrollView contentInsetAdjustmentBehavior="never" keyboardShouldPersistTaps="handled"
        contentContainerStyle={[s.page, { paddingTop: insets.top + 4, paddingBottom: insets.bottom + 48 }]}>
        <View style={s.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="Go back" style={s.back} disabled={busy}
            onPress={() => router.canGoBack() ? router.back() : router.replace("/home")}>
            <View style={s.chevron} />
          </Pressable>
          <Text accessibilityRole="header" style={s.title}>Create Post</Text>
        </View>

        <View style={s.preview}>
          {photo ? (
            <>
              {photo.type === "video" ? <PostVideo uri={photo.uri} /> : <Image source={{ uri: photo.uri }} contentFit="cover" style={StyleSheet.absoluteFill}
                accessible accessibilityLabel="Selected photo" />}
              <Pressable accessibilityRole="button" accessibilityLabel="Remove attachment" style={[s.remove, s.removePhoto]} disabled={busy} onPress={removeMedia}>
                <Text style={s.cross}>×</Text>
              </Pressable>
            </>
          ) : (
            <Pressable accessibilityRole="button" onPress={openPhotoSources} style={s.choose}>
              <Text style={s.chooseText}>Choose a photo</Text>
            </Pressable>
          )}
        </View>

        <View style={s.details}>
          <Text style={s.label}>Caption</Text>
          <TextInput accessibilityLabel="Caption" style={s.input} editable={!busy} multiline maxLength={captionLimit}
            value={caption} onChangeText={setCaption} textAlignVertical="top" />
          <Text style={s.count}>{caption.length}/{captionLimit}</Text>

          {!!photo && <View style={s.status}>
            <View style={s.ring} />
            <View style={s.progressBody}>
              <View style={s.statusRow}>
                <Text style={s.statusText}>{busy ? (progress === 100 ? "Publishing…" : "Uploading… " + progress + "%") : photo.type === "video" ? "Video selected" : "Photo selected"}</Text>
              </View>
              <View accessibilityRole="progressbar" accessibilityLabel="Upload progress"
                accessibilityValue={{ min: 0, max: 100, now: progress ?? 100 }} style={s.track}>
                <View style={[s.fill, { width: `${progress ?? 100}%` }]} />
              </View>
            </View>
          </View>}
        </View>

        <Pressable accessibilityRole="button" disabled={!photo || busy} onPress={publish}
          style={({ pressed }) => [s.publish, (pressed || !photo || busy) && s.dim]}>
          <Text style={s.publishText}>{busy ? "Publishing…" : "Publish"}</Text>
        </Pressable>
        {!!message && <Text accessibilityLiveRegion="polite" style={s.message}>{message}</Text>}
      </ScrollView>
      {webChooserOpen && (
        <Modal transparent onRequestClose={() => setWebChooserOpen(false)}>
          <View style={s.backdrop}>
            <View style={s.dialog}>
              <Pressable accessibilityRole="button" style={s.option} onPress={() => choosePhoto("gallery")}>
                <Text style={s.chooseText}>Gallery</Text>
              </Pressable>
              <Pressable accessibilityRole="button" style={s.option} onPress={() => choosePhoto("camera")}>
                <Text style={s.chooseText}>Camera</Text>
              </Pressable>
              <Pressable accessibilityRole="button" style={s.option} onPress={() => setWebChooserOpen(false)}>
                <Text>Cancel</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      )}
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f8f7fd" },
  page: { width: "100%", maxWidth: 540, alignSelf: "center", paddingHorizontal: 15 },
  header: { minHeight: 44, justifyContent: "center", alignItems: "center", marginBottom: 20 },
  back: { position: "absolute", left: 6, width: 44, height: 44, borderRadius: 13, borderWidth: 1, borderColor: "#d4d1ff", justifyContent: "center", alignItems: "center" },
  chevron: { width: 13, height: 13, borderLeftWidth: 2.4, borderBottomWidth: 2.4, transform: [{ rotate: "45deg" }], marginLeft: 5 },
  title: { fontSize: 24, letterSpacing: -0.6, fontWeight: "700", color: "#090a12" },
  preview: { width: "100%", aspectRatio: 752 / 531, borderRadius: 18, overflow: "hidden", backgroundColor: "#ebe7fb" },
  remove: { position: "absolute", top: "3%", right: "2.4%", width: "12%", minHeight: 44, aspectRatio: 1, alignItems: "center", justifyContent: "center" },
  removePhoto: { backgroundColor: "#222944bb", borderRadius: 50 },
  cross: { fontSize: 30, color: "white" },
  choose: { flex: 1, alignItems: "center", justifyContent: "center" },
  backdrop: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#0006" },
  dialog: { padding: 12, backgroundColor: "white", borderRadius: 16 },
  option: { minHeight: 44, minWidth: 120, alignItems: "center", justifyContent: "center" },
  chooseText: { color: "#6431ca", fontSize: 17, fontWeight: "600" },
  details: { paddingHorizontal: 2 },
  label: { marginTop: 15, marginBottom: 11, marginLeft: 4, fontSize: 16, fontWeight: "700", color: "#0b0b13" },
  input: { minHeight: 94, paddingHorizontal: 16, paddingVertical: 13, borderColor: "#c9c6dc", borderWidth: 1, borderRadius: 15, fontSize: 17, lineHeight: 22, color: "#0a0a0e" },
  count: { textAlign: "right", marginRight: 3, marginTop: 6, color: "#8c8ba7", fontSize: 15 },
  status: { marginTop: 27, padding: 17, borderWidth: 1, borderColor: "#d1ccff", borderRadius: 14, backgroundColor: "#f1effb", alignItems: "center", flexDirection: "row", gap: 15 },
  ring: { width: 35, height: 35, borderWidth: 4.5, borderRadius: 18, borderColor: "#6931ff" },
  progressBody: { flex: 1, gap: 10 },
  statusRow: { flexDirection: "row", justifyContent: "space-between" },
  statusText: { fontWeight: "600", fontSize: 16, color: "#14131c" },
  track: { height: 9, borderRadius: 5, backgroundColor: "#cecaff", overflow: "hidden" },
  fill: { height: "100%", borderRadius: 5, backgroundColor: "#7026ff" },
  publish: { minHeight: 53, marginTop: 47, borderRadius: 32, justifyContent: "center", alignItems: "center", backgroundColor: "#713bfb", experimental_backgroundImage: "linear-gradient(155deg, #af67fb 0%, #7a48fa 34%, #5223f5 100%)" },
  publishText: { color: "white", fontWeight: "700", fontSize: 20 },
  dim: { opacity: 0.55 },
  message: { textAlign: "center", marginTop: 10, color: "#554c72" },
});
