import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { Pressable, Text } from "react-native";
import { s } from "./chatStyles";

export function VoiceNote({ uri, mine }: { uri: string; mine: boolean }) {
  const player = useAudioPlayer(uri);
  const { playing, currentTime, duration } = useAudioPlayerStatus(player);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={playing ? "Pause voice message" : "Play voice message"}
      onPress={async () => {
        if (playing) player.pause();
        else {
          if (duration && currentTime >= duration - 0.1) await player.seekTo(0);
          player.play();
        }
      }}
    >
      <Text style={mine ? s.light : s.body}>
        {playing ? "Ⅱ" : "▶"} Voice message · {Math.floor(currentTime)}s
      </Text>
    </Pressable>
  );
}
