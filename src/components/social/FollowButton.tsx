import { useMutation } from "convex/react";
import { useState } from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { api } from "../../../convex/_generated/api";
import type { Person } from "./types";

export function FollowButton({ person, compact = false, list = false }: { person: Person; compact?: boolean; list?: boolean }) {
  const follow = useMutation(api.social.setFollow);
  const [error, setError] = useState(false);
  if (person.isMe) return null;
  async function toggle() {
    setError(false);
    try { await follow({ profileId: person.id, following: !person.following }); }
    catch { setError(true); }
  }
  return <Pressable accessibilityRole="button" accessibilityLabel={(person.following ? "Unfollow " : "Follow ") + person.name}
    onPress={toggle} style={({ pressed }) => [s.button, compact && s.cardButton, list && s.listButton,
      person.following && s.followingButton, person.following && pressed && s.pressedFollowing]}>
    <Text numberOfLines={1} adjustsFontSizeToFit style={[s.label, compact && s.cardLabel, list && s.listLabel, person.following && s.followingLabel]}>{error ? "Retry" : person.following ? "Following" : "Follow"}</Text>
  </Pressable>;
}

const s = StyleSheet.create({
  button: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 18, backgroundColor: "#773efa" },
  listButton: { width: 80, minHeight: 29, paddingHorizontal: 6, paddingVertical: 4, justifyContent: "center", backgroundImage: "linear-gradient(160deg, #914aff, #5828ff)" },
  followingButton: {
    borderRadius: 999,
    backgroundColor: "#e8e2ff",
    backgroundImage: "linear-gradient(170deg, #f5f1ff 0%, #eae4ff 45%, #ddd6fb 100%)",
    boxShadow: "0px 1px 2px #492a951f",
  },
  followingLabel: { color: "#5217dc", fontWeight: "700" },
  pressedFollowing: { transform: [{ scale: 0.98 }], boxShadow: "none" },
  listLabel: { fontSize: 13, fontWeight: "500" },
  cardButton: { alignSelf: "stretch", marginTop: 7, paddingHorizontal: 5 },
  label: { color: "white", fontWeight: "600", textAlign: "center" },
  cardLabel: { fontSize: 12, lineHeight: 16 },
});
