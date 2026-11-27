import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from "expo-audio";
import { randomUUID } from "expo-crypto";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "../../../../convex/_generated/api";
import { FeedIcon } from "../../../components/home/FeedIcon";
import { useChatPresence } from "../../../components/messages/useChatPresence";
import { s } from "../../../components/messages/chatStyles";
import { MessageBubble, type ChatMessage } from "../../../components/messages/MessageBubble";
import { useSocialSession } from "../../../components/social/SocialSession";
import { uploadMedia } from "../../../components/social/upload";

const icons = {
  back: require("../../../../assets/images/chat/back.png"),
  phone: require("../../../../assets/images/chat/phone.png"),
  video: require("../../../../assets/images/chat/video.png"),
  gallery: require("../../../../assets/images/chat/gallery.png"),
  attach: require("../../../../assets/images/chat/attach.png"),
  mic: require("../../../../assets/images/chat/mic.png"),
};

function Control({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof icons | "more";
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={4}
      style={[s.control, (icon === "gallery" || icon === "attach") && s.composerButton]}
    >
      {icon === "more" ? (
        <FeedIcon name="more" size={18} />
      ) : (
        <Image source={icons[icon]} contentFit="contain" style={s.icon} />
      )}
    </Pressable>
  );
}

export default function ChatScreen() {
  const { handle } = useLocalSearchParams<{ handle: string }>();
  return <Thread key={handle} handle={handle} />;
}

function Thread({ handle }: { handle: string }) {
  const { ready, message } = useSocialSession();
  const peer = useQuery(api.messages.peer, ready ? { handle } : "skip");
  const { online, typing, signalTyping } = useChatPresence(handle, ready && !!peer);
  const history = usePaginatedQuery(api.messages.history, ready && peer ? { handle } : "skip", {
    initialNumItems: 40,
  });
  const send = useMutation(api.messages.send);
  const read = useMutation(api.messages.markRead);
  const begin = useMutation(api.messages.beginUpload);
  const insets = useSafeAreaInsets();
  const list = useRef<FlatList<ChatMessage>>(null);
  const nearEnd = useRef(true);
  const busy = useRef(false);
  const request = useRef("");
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState("");
  const [photos, setPhotos] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [voice, setVoice] = useState("");
  const [location, setLocation] = useState("");
  const [entry, setEntry] = useState<"Voice call" | "Video call" | "Place" | null>(null);
  const [value, setValue] = useState("");
  const [gallery, setGallery] = useState<string[] | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recording = useAudioRecorderState(recorder).isRecording;
  const newestIncoming = history.results[0]?.mine ? undefined : history.results[0]?.id;
  const ordered = history.results.slice().reverse();
  const avatar = peer?.avatar || require("../../../../assets/images/home/avatar.jpg");

  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => {
        setFocused(false);
        if (recorder.isRecording) {
          void recorder
            .stop()
            .then(() => setAudioModeAsync({ allowsRecording: false }))
            .catch(() => {});
        }
      };
    }, [recorder]),
  );
  useEffect(() => {
    if (focused && newestIncoming) {
      read({ handle, throughId: newestIncoming }).catch(() =>
        setError("Couldn’t mark the conversation as read."),
      );
    }
  }, [focused, newestIncoming, handle, read]);

  function edit() {
    request.current = "";
    setError("");
  }
  async function choosePhotos() {
    if (busy.current || recording) return;
    try {
      const pick = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsMultipleSelection: true,
        selectionLimit: 6,
      });
      if (!pick.canceled && pick.assets.some((asset) => (asset.fileSize || 0) > 25 * 1024 * 1024)) {
        setError("Choose photos of 25 MB or less.");
        return;
      }
      if (!pick.canceled) {
        edit();
        setPhotos(pick.assets.slice(0, 6));
      }
    } catch {
      setError("Couldn’t open your photos. Try again.");
    }
  }
  async function record() {
    if (busy.current) return;
    try {
      if (recorder.isRecording) {
        await recorder.stop();
        await setAudioModeAsync({ allowsRecording: false });
        if (recorder.uri) {
          edit();
          setVoice(recorder.uri);
        }
      } else {
        if (!(await AudioModule.requestRecordingPermissionsAsync()).granted) {
          setError("Allow microphone access to record a voice message.");
          return;
        }
        await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
        await recorder.prepareToRecordAsync();
        recorder.record();
      }
    } catch {
      setError("Couldn’t record that voice message. Try again.");
    }
  }
  async function submit() {
    if (busy.current || !peer || recording || !(draft.trim() || photos.length || voice || location))
      return;
    busy.current = true;
    request.current ||= randomUUID();
    setSending(true);
    setError("");
    try {
      const attachments = [];
      for (const asset of photos) attachments.push(await uploadMedia(asset, begin, () => {}));
      let audio;
      if (voice) {
        const blob = Platform.OS === "web" ? await (await fetch(voice)).blob() : undefined;
        const file = blob ? new File([blob], "voice.webm", { type: blob.type }) : undefined;
        audio = await uploadMedia(
          { uri: voice, mimeType: file?.type || "audio/mp4", file },
          begin,
          () => {},
        );
      }
      await send({
        handle,
        text: draft.trim(),
        clientId: request.current,
        attachments,
        ...(audio && { voice: audio }),
        ...(location && { location }),
      });
      nearEnd.current = true;
      setDraft("");
      setPhotos([]);
      setVoice("");
      setLocation("");
      request.current = "";
      list.current?.scrollToEnd({ animated: true });
    } catch {
      setError("Couldn’t send. Your message is saved here. Tap Send to retry.");
    } finally {
      busy.current = false;
      setSending(false);
    }
  }
  function showEntry(kind: NonNullable<typeof entry>) {
    if (!busy.current) {
      setValue("");
      setEntry(kind);
    }
  }
  function applyEntry() {
    const text = value.trim();
    if (!text) return;
    if (entry !== "Place" && !/^https:\/\/\S+$/i.test(text)) {
      Alert.alert("Enter an HTTPS meeting link.");
      return;
    }
    edit();
    if (entry === "Place") setLocation(text);
    else setDraft([draft, entry + " invitation: " + text].filter(Boolean).join("\n"));
    setEntry(null);
  }
  return (
    <KeyboardAvoidingView style={s.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <StatusBar style="dark" />
      <View style={[s.header, { paddingTop: insets.top }]}>
        <Image
          source={require("../../../../assets/images/chat/range.png")}
          contentFit="fill"
          style={s.mountains}
        />
        <View style={[s.toolbar, { paddingLeft: 10 + insets.left, paddingRight: 12 + insets.right }]}>
          <Control icon="back" label="Back to Messages" onPress={() => router.dismissTo("/messages")} />
          <View>
            <Image source={avatar} style={s.avatar} />
            {online && <View style={s.onlineDot} />}
          </View>
          <View style={s.identity}>
            <Text numberOfLines={1} style={s.name}>
              {peer?.name || handle}
            </Text>
            <Text numberOfLines={1} style={s.status}>
              {online ? (
                <>
                  <Text style={s.green}>● </Text>Online now
                </>
              ) : (
                "@" + handle
              )}
            </Text>
          </View>
          <Control icon="phone" label="Invite to a voice call" onPress={() => showEntry("Voice call")} />
          <Control icon="video" label="Invite to a video call" onPress={() => showEntry("Video call")} />
          <Control
            icon="more"
            label="Conversation options"
            onPress={() =>
              Alert.alert(peer?.name || handle, undefined, [
                {
                  text: "View shared photos",
                  onPress: () => setGallery(ordered.flatMap((item) => item.photos)),
                },
                { text: "Cancel", style: "cancel" },
              ])
            }
          />
        </View>
      </View>
      <View style={[s.page, { paddingLeft: insets.left, paddingRight: insets.right }]}>
        <FlatList
          ref={list}
          data={ordered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={s.history}
          keyboardShouldPersistTaps="handled"
          contentInsetAdjustmentBehavior="never"
          maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
          onScroll={({ nativeEvent: e }) => {
            nearEnd.current = e.contentSize.height - e.layoutMeasurement.height - e.contentOffset.y < 72;
          }}
          onContentSizeChange={() => {
            if (nearEnd.current) list.current?.scrollToEnd({ animated: false });
          }}
          ListHeaderComponent={
            history.status === "CanLoadMore" ? (
              <Text accessibilityRole="button" onPress={() => history.loadMore(40)} style={s.meta}>
                Earlier messages
              </Text>
            ) : undefined
          }
          ListFooterComponent={
            typing ? (
              <View accessible accessibilityLabel={handle + " is typing"} style={s.incoming}>
                <Image source={avatar} style={s.smallAvatar} />
                <View style={s.typing}>
                  {["#6720ff", "#8242ff", "#a17aef"].map((color) => (
                    <View key={color} style={[s.dot, { backgroundColor: color }]} />
                  ))}
                </View>
              </View>
            ) : undefined
          }
          ListEmptyComponent={
            <Text style={s.meta}>
              {!ready
                ? message
                : peer === null
                  ? "Profile unavailable"
                  : history.status === "Exhausted"
                    ? "Send the first message."
                    : "Loading messages…"}
            </Text>
          }
          renderItem={({ item, index }) => {
            const date = new Date(item.createdAt).toDateString();
            const first = !index || date !== new Date(ordered[index - 1].createdAt).toDateString();
            return (
              <View style={{ gap: 6 }}>
                {first && (
                  <Text style={s.day}>
                    {date === new Date().toDateString()
                      ? "Today"
                      : new Date(item.createdAt).toLocaleDateString()}
                  </Text>
                )}
                <MessageBubble item={item} avatar={avatar} openPhotos={setGallery} />
              </View>
            );
          }}
        />
        {!!error && (
          <Text accessibilityLiveRegion="polite" style={s.meta}>
            {error}
          </Text>
        )}
        {(photos.length > 0 || !!voice || !!location) && (
          <View style={s.pending}>
            {photos.map((a) => (
              <Image key={a.uri} source={a.uri} style={s.preview} />
            ))}
            {!!voice && <Text>Voice message</Text>}
            {!!location && <Text>{location}</Text>}
            <Text
              accessibilityRole="button"
              disabled={sending}
              onPress={() => {
                edit();
                setPhotos([]);
                setVoice("");
                setLocation("");
              }}
            >
              Remove
            </Text>
          </View>
        )}
        <View style={s.composer} pointerEvents={peer && !sending ? "auto" : "none"}>
          <Control icon="gallery" label="Choose photos" onPress={choosePhotos} />
          <Control
            icon="attach"
            label="Attach to message"
            onPress={() =>
              Alert.alert("Attach to message", undefined, [
                { text: "Photos", onPress: choosePhotos },
                { text: "Place", onPress: () => showEntry("Place") },
                { text: "Cancel", style: "cancel" },
              ])
            }
          />
          <View style={s.inputBox}>
            <TextInput
              value={draft}
              editable={!sending && !recording && !!peer}
              maxLength={4000}
              onChangeText={(text) => {
                edit();
                setDraft(text);
                if (text.trim()) signalTyping();
              }}
              accessibilityLabel="Message"
              placeholder={recording ? "Recording…" : "Type a message..."}
              placeholderTextColor="#515472"
              onSubmitEditing={submit}
              returnKeyType="send"
              style={s.input}
            />
            <Pressable
              accessibilityLabel={recording ? "Stop recording" : "Record voice message"}
              accessibilityRole="button"
              onPress={record}
              style={s.mic}
            >
              {recording ? (
                <Text style={{ color: "#ac254b" }}>■</Text>
              ) : (
                <Image source={icons.mic} contentFit="contain" style={s.icon} />
              )}
            </Pressable>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Send message"
            disabled={
              sending || recording || !peer || !(draft.trim() || photos.length || voice || location)
            }
            onPress={submit}
            style={s.send}
          >
            {sending ? <Text style={s.light}>…</Text> : <FeedIcon name="send" color="white" size={20} />}
          </Pressable>
        </View>
      </View>
      <Modal
        visible={gallery !== null || entry !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          setGallery(null);
          setEntry(null);
        }}
      >
        <View style={[s.gallery, { paddingTop: 24 }]}>
          <View style={s.galleryHeader}>
            <Text style={s.name}>{entry || "Shared photos"}</Text>
            <Text
              accessibilityRole="button"
              style={s.done}
              onPress={() => {
                setGallery(null);
                setEntry(null);
              }}
            >
              Close
            </Text>
          </View>
          {entry ? (
            <>
              <TextInput
                autoFocus
                style={[s.inputBox, { flex: 0, padding: 12 }]}
                value={value}
                onChangeText={setValue}
                maxLength={entry === "Place" ? 120 : 1000}
                autoCapitalize="none"
                placeholder={entry === "Place" ? "Place name" : "Paste a meeting link"}
              />
              <Text accessibilityRole="button" onPress={applyEntry} style={s.done}>
                Add to message
              </Text>
            </>
          ) : (
            <ScrollView>
              {gallery?.length ? (
                gallery.map((uri, i) => (
                  <Image key={uri + i} source={uri} contentFit="contain" style={s.fullPhoto} />
                ))
              ) : (
                <Text style={s.meta}>No shared photos in the loaded messages.</Text>
              )}
            </ScrollView>
          )}
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}
