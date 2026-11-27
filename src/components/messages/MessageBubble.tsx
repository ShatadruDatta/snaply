import { Image } from "expo-image";
import type { FunctionReturnType } from "convex/server";
import { Alert, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import type { api } from "../../../convex/_generated/api";
import { FeedIcon } from "../home/FeedIcon";
import { s } from "./chatStyles";
import { VoiceNote } from "./VoiceNote";

export type ChatMessage = FunctionReturnType<typeof api.messages.history>["page"][number];

export function MessageBubble({
  item,
  avatar,
  openPhotos,
}: {
  item: ChatMessage;
  avatar: string | number;
  openPhotos: (urls: string[]) => void;
}) {
  const { mine, photos } = item;
  const time = new Date(item.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const hasBubble = !!(item.text || item.audio || item.location);
  const link = item.text.match(/https:\/\/[^\s]+/i)?.[0];
  return (
    <View style={{ gap: 3 }}>
      {photos.length > 0 && (
        <Pressable
          accessibilityRole="imagebutton"
          accessibilityLabel={`View ${photos.length} shared photos`}
          onPress={() => openPhotos(photos)}
          style={[s.collage, !mine && { alignSelf: "flex-start" }]}
        >
          <Image source={photos[0]} style={s.mainPhoto} contentFit="cover" />
          {photos.length > 1 && (
            <View style={s.thumbnails}>
              <Image source={photos[1]} style={s.thumbnail} />
              {photos.length > 2 && (
                <View style={s.thumbnail}>
                  <Image source={photos[2]} style={StyleSheet.absoluteFill} />
                  {photos.length > 3 && <Text style={s.morePhotos}>+{photos.length - 3}</Text>}
                </View>
              )}
            </View>
          )}
        </Pressable>
      )}
      {hasBubble && (
        <View style={mine ? s.sent : s.incoming}>
          {!mine && <Image source={avatar} style={s.smallAvatar} />}
          <View style={mine ? undefined : s.received}>
            {!!item.location && (
              <View style={s.place}>
                <FeedIcon name="pin" size={14} color={mine ? "white" : "#5732ab"} />
                <Text style={[s.placeText, !mine && s.body]}>{item.location}</Text>
              </View>
            )}
            {!!item.text && (
              <Text
                style={mine ? s.light : s.body}
                onPress={
                  link
                    ? () => Linking.openURL(link).catch(() => Alert.alert("Couldn’t open this link."))
                    : undefined
                }
              >
                {item.text}
              </Text>
            )}
            {item.audio && <VoiceNote uri={item.audio} mine={mine} />}
            {mine && <Text style={s.outTime}>{time} ✓</Text>}
          </View>
        </View>
      )}
      {(!mine || !hasBubble) && (
        <Text style={mine ? s.photoTime : s.inTime}>
          {time}
          {mine ? " ✓" : ""}
        </Text>
      )}
    </View>
  );
}
