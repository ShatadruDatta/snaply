import { VideoView, useVideoPlayer } from "expo-video";
import { StyleSheet } from "react-native";

export function PostVideo({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri);
  return <VideoView player={player} nativeControls contentFit="contain" style={StyleSheet.absoluteFill} />;
}
