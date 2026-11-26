import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { type ComponentRef, useEffect, useRef, useState } from "react";
import { Alert, Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FeedIcon } from "../../../components/home/FeedIcon";
import { conversations } from "../../../components/messages/conversations";
import { useThreads } from "../../../components/messages/Threads";

const icons = {
  back: require("../../../../assets/images/chat/back.png"),
  phone: require("../../../../assets/images/chat/phone.png"),
  video: require("../../../../assets/images/chat/video.png"),
  gallery: require("../../../../assets/images/chat/gallery.png"),
  attach: require("../../../../assets/images/chat/attach.png"),
  mic: require("../../../../assets/images/chat/mic.png"),
};
const photos = [
  require("../../../../assets/images/chat/peak.png"),
  require("../../../../assets/images/chat/flags.png"),
  require("../../../../assets/images/home/himalayas.jpg"),
  require("../../../../assets/images/profile/lake.jpg"),
  require("../../../../assets/images/profile/forest.jpg"),
  require("../../../../assets/images/profile/summit.jpg"),
];

function Control({ icon, label, onPress }: { icon: keyof typeof icons | "more"; label: string; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} hitSlop={3} style={[s.control, (icon === "gallery" || icon === "attach") && s.composerButton]}>
    {icon === "more" ? <FeedIcon name="more" size={18} /> : <Image source={icons[icon]} contentFit="contain" style={s.icon} />}
  </Pressable>;
}

function Incoming({ avatar, children, time }: { avatar: number; children: string; time?: string }) {
  return <View>
    <View style={s.incoming}>
      <Image source={avatar} style={s.smallAvatar} />
      <View style={s.received}><Text style={s.body}>{children}</Text></View>
    </View>
    {time && <Text style={s.inTime}>{time}</Text>}
  </View>;
}

export default function ChatScreen() {
  const { handle } = useLocalSearchParams<{ handle: string }>();
  const person = conversations.find(item => item.name === handle);
  const { markRead, threads, append } = useThreads();
  const insets = useSafeAreaInsets();
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const followEnd = useRef(false);
  const [draft, setDraft] = useState("");
  const [gallery, setGallery] = useState(false);
  const [keyboard, setKeyboard] = useState(false);
  useEffect(() => { if (person) markRead(person.name); }, [markRead, person]);

  useEffect(() => {
    const show = Keyboard.addListener("keyboardWillShow", () => setKeyboard(true));
    const hide = Keyboard.addListener("keyboardWillHide", () => setKeyboard(false));
    return () => { show.remove(); hide.remove(); };
  }, []);

  if (!person) return <Redirect href="/messages" />;
  const { name, avatar } = person;
  function send(photo?: string) {
    if (!draft.trim() && !photo) return;
    followEnd.current = true;
    append(name, draft.trim(), photo);
    setDraft("");
  }
  async function attach() {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"] });
      if (!result.canceled) send(result.assets[0].uri);
    } catch {
      Alert.alert("Couldn’t open photos", "Please try again.");
    }
  }
  function back() {
    router.dismissTo("/messages");
  }
  return (
    <KeyboardAvoidingView style={s.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <StatusBar style="dark" />
      <View style={[s.header, { paddingTop: insets.top }]}>
        <Image source={require("../../../../assets/images/chat/range.png")} contentFit="fill" style={s.mountains} />
        <View style={[s.toolbar, { paddingLeft: 10 + insets.left, paddingRight: 12 + insets.right }]}>
          <Control icon="back" label="Back to Messages" onPress={back} />
          <View><Image source={avatar} style={s.avatar} /><View style={s.onlineDot} /></View>
          <View style={s.identity}>
            <Text numberOfLines={1} adjustsFontSizeToFit style={s.name}>{name}</Text>
            <Text style={s.status}><Text style={s.green}>● </Text>Online now</Text>
          </View>
          <Control icon="phone" label="Voice call" onPress={() => Alert.alert("Voice calls are unavailable in this demo.")} />
          <Control icon="video" label="Video call" onPress={() => Alert.alert("Video calls are unavailable in this demo.")} />
          <Control icon="more" label="Conversation options" onPress={() => Alert.alert(name, undefined, [{ text: "View shared photos", onPress: () => setGallery(true) }, { text: "Cancel", style: "cancel" }])} />
        </View>
      </View>
      <View style={[s.page, { paddingLeft: insets.left, paddingRight: insets.right }]}>
        <ScrollView ref={scroll} automaticallyAdjustContentInsets={false} contentInsetAdjustmentBehavior="never" keyboardShouldPersistTaps="handled"
          contentContainerStyle={s.history} onContentSizeChange={() => { if (followEnd.current) scroll.current?.scrollToEnd({ animated: true }); }}>
          <Text style={s.day}>Today</Text>
          <Incoming avatar={avatar} time="10:24 AM">{"Hey! 👋\nHow was your trip to Himalayas?\nThe photos looked amazing! 😍"}</Incoming>
          <View style={s.sent}><Text style={s.light}>It was absolutely stunning! 🌄 The views were surreal, totally worth it!</Text><Text style={s.outTime}>10:26 AM  ✓✓</Text></View>
          <View>
            <Pressable accessibilityRole="button" accessibilityLabel="View six shared travel photos" style={s.collage} onPress={() => setGallery(true)}>
              <Image source={photos[0]} style={s.mainPhoto} />
              <View style={s.thumbnails}><Image source={photos[1]} style={s.thumbnail} />
                <View style={s.thumbnail}><Image source={photos[2]} style={StyleSheet.absoluteFill} /><Text style={s.morePhotos}>+3</Text></View>
              </View>
            </Pressable>
            <Text style={s.photoTime}>10:27 AM  ✓✓</Text>
          </View>
          <Incoming avatar={avatar} time="10:28 AM">{"Wow! These are incredible! 😍\nWhich place is this?"}</Incoming>
          <View style={[s.sent, s.locationBubble]}>
            <View style={s.place}><FeedIcon name="pin" color="white" size={14} /><Text style={s.placeText}>Triund, Himachal Pradesh</Text></View>
            <Text style={s.light}>You should definitely plan a trip here sometime. It’s perfect for a short getaway! ✨</Text>
            <Text style={s.outTime}>10:30 AM  ✓✓</Text>
          </View>
          {(threads[name] || []).map((message, index) => <View key={index} style={s.sent}>
            {message.photo && <Image source={message.photo} style={s.attached} />}
            {!!message.text && <Text style={s.light}>{message.text}</Text>}
            <Text style={s.outTime}>{message.time}</Text>
          </View>)}
          {!threads[name]?.length && <View accessible accessibilityLabel={name + " is typing"} style={s.incoming}>
            <Image source={avatar} style={s.smallAvatar} /><View style={s.typing}>{["#6720ff", "#8242ff", "#a17aef"].map(color => <View key={color} style={[s.dot, { backgroundColor: color }]} />)}</View>
          </View>}
        </ScrollView>
        <View style={[s.composer, { marginBottom: Platform.OS === "ios" && !keyboard ? 82 : 0 }]}>
          <Control icon="gallery" label="View shared photos" onPress={() => setGallery(true)} />
          <Control icon="attach" label="Attach photo" onPress={attach} />
          <View style={s.inputBox}><TextInput value={draft} onChangeText={setDraft} accessibilityLabel="Message" placeholder="Type a message..." placeholderTextColor="#515472"
            onSubmitEditing={() => send()} returnKeyType="send" style={s.input} />
            <Pressable accessibilityLabel="Voice message" accessibilityRole="button" onPress={() => Alert.alert("Voice recording is unavailable in this demo.")} style={s.mic}><Image source={icons.mic} contentFit="contain" style={s.icon} /></Pressable>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Send message" disabled={!draft.trim()} onPress={() => send()} style={s.send}><FeedIcon name="send" color="white" size={20} /></Pressable>
        </View>
      </View>
      <Modal visible={gallery} animationType="slide" onRequestClose={() => setGallery(false)}>
        <View style={[s.gallery, { paddingTop: insets.top + 12 }]}>
          <View style={s.galleryHeader}><Text style={s.name}>Shared photos</Text><Pressable accessibilityRole="button" onPress={() => setGallery(false)}><Text style={s.done}>Done</Text></Pressable></View>
          <ScrollView>{photos.map(source => <Image key={source} source={source} style={s.fullPhoto} />)}</ScrollView>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#fcfbfe" },
  header: { paddingBottom: 34, backgroundColor: "#eae3fb", backgroundImage: "linear-gradient(160deg,#d6d9fc,#f5eafa 85%,#ffe1e6)" },
  mountains: { position: "absolute", bottom: 0, left: 0, width: "100%", height: 44 },
  toolbar: { flexDirection: "row", alignItems: "center", gap: 6, minHeight: 46 },
  control: { width: 35, height: 35, borderRadius: 20, justifyContent: "center", alignItems: "center", backgroundColor: "#ffffffbc" },
  composerButton: { backgroundColor: "#f0edf6", borderRadius: 14, height: 38, width: 38 },
  icon: { width: 19, height: 19 },
  avatar: { width: 44, height: 44, borderRadius: 22 }, onlineDot: { position: "absolute", right: 0, bottom: 1, width: 11, height: 11, borderRadius: 6, backgroundColor: "#12c943", borderColor: "white", borderWidth: 1.3 },
  identity: { flex: 1, minWidth: 0, gap: 1 }, name: { color: "#100e18", fontSize: 17, fontWeight: "700" }, status: { color: "#414661", fontSize: 12 }, green: { color: "#10c943" },
  page: { flex: 1, width: "100%", maxWidth: 570, alignSelf: "center" },
  history: { paddingHorizontal: 11, paddingVertical: 8, gap: 6 },
  day: { alignSelf: "center", paddingHorizontal: 11, paddingVertical: 3, backgroundColor: "#eae6f3", borderRadius: 12, overflow: "hidden", fontSize: 12, color: "#484964" },
  incoming: { flexDirection: "row", alignItems: "flex-end", gap: 7 }, smallAvatar: { width: 35, height: 35, borderRadius: 18 },
  received: { maxWidth: "80%", backgroundColor: "#efecf5", borderRadius: 18, paddingHorizontal: 15, paddingVertical: 7 },
  body: { fontSize: 14.5, lineHeight: 17, color: "#111017" },
  inTime: { marginLeft: 54, marginTop: 2, color: "#515877", fontSize: 10 },
  sent: { alignSelf: "flex-end", maxWidth: "69%", borderRadius: 18, backgroundColor: "#6728f5", backgroundImage: "linear-gradient(120deg,#7939fa,#5a18fa)", paddingHorizontal: 16, paddingTop: 7, paddingBottom: 5 },
  light: { fontSize: 14.5, lineHeight: 17.5, color: "#fff" }, outTime: { alignSelf: "flex-end", color: "#fff", fontSize: 10 },
  collage: { alignSelf: "flex-end", width: "79%", aspectRatio: 2.22, flexDirection: "row", gap: 4, borderRadius: 18, overflow: "hidden" },
  mainPhoto: { flex: 1.62, borderRadius: 4 }, thumbnails: { flex: 1, gap: 4 }, thumbnail: { flex: 1, borderRadius: 4, overflow: "hidden" },
  morePhotos: { flex: 1, textAlign: "right", paddingTop: "23%", paddingRight: 10, backgroundColor: "#100e284f", color: "white", fontSize: 17, fontWeight: "700" },
  photoTime: { alignSelf: "flex-end", marginTop: 3, fontSize: 10, color: "#515877" },
  locationBubble: { maxWidth: "66%" }, place: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, marginBottom: 4, backgroundColor: "#ffffff33", borderRadius: 14 }, placeText: { fontSize: 13, color: "white", flexShrink: 1 },
  typing: { flexDirection: "row", gap: 4, paddingHorizontal: 14, height: 33, borderRadius: 18, backgroundColor: "#efecf5", alignItems: "center" }, dot: { width: 6, height: 6, borderRadius: 3 },
  composer: { flexDirection: "row", gap: 7, alignItems: "center", paddingHorizontal: 10, paddingVertical: 7, backgroundColor: "#fcfbfe" },
  inputBox: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", borderRadius: 24, backgroundColor: "#f0edf7", borderColor: "#dedced", borderWidth: 1 },
  input: { flex: 1, minWidth: 0, height: 37, color: "#161421", paddingLeft: 13, fontSize: 14 },
  mic: { paddingHorizontal: 9 }, send: { width: 40, height: 38, backgroundColor: "#7132fc", borderRadius: 22, justifyContent: "center", alignItems: "center" },
  gallery: { flex: 1, paddingHorizontal: 14, backgroundColor: "#fcfbfe" }, galleryHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }, done: { color: "#6927f4", padding: 8 }, fullPhoto: { width: "100%", height: 240, borderRadius: 16, marginBottom: 10 }, attached: { width: 160, height: 120, borderRadius: 12 },
});
