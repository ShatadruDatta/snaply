import { useAuth, useUser } from "@clerk/expo";
import { Redirect } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

export default function AccountScreen() {
  const { isLoaded, isSignedIn, signOut } = useAuth();
  const { user } = useUser();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  if (!isLoaded) return <ActivityIndicator style={styles.screen} />;
  if (!isSignedIn) return <Redirect href="/auth" />;

  async function handleSignOut() {
    setPending(true);
    setError("");
    try {
      await signOut();
    } catch {
      setError("Sign-out could not finish. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>{user?.firstName ? "Welcome, " + user.firstName : "Welcome to Snaply"}</Text>
      <Text>{user?.primaryEmailAddress?.emailAddress}</Text>
      <Pressable accessibilityRole="button" disabled={pending} onPress={handleSignOut} style={styles.button}>
        <Text style={styles.label}>{pending ? "Signing out…" : "Sign out"}</Text>
      </Pressable>
      {error ? <Text accessibilityRole="alert">{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, justifyContent: "center", alignItems: "center", gap: 14, padding: 24, backgroundColor: "#f8f7fc" },
  title: { fontSize: 28, fontWeight: "700", color: "#090b15" },
  button: { borderRadius: 24, paddingHorizontal: 30, paddingVertical: 14, backgroundColor: "#111" },
  label: { color: "#fff", fontWeight: "600" },
});
