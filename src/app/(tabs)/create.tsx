import { Text, View } from "react-native";

export default function CreateScreen() {
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", gap: 8, backgroundColor: "#f8f7fc" }}>
      <Text accessibilityRole="header" style={{ fontSize: 26, fontWeight: "700" }}>Create</Text>
      <Text>Post creation is coming soon.</Text>
    </View>
  );
}
