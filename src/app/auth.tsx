import { useAuth, useSSO } from "@clerk/expo";
import { makeRedirectUri } from "expo-auth-session";
import { Redirect } from "expo-router";
import { useRef, useState } from "react";
import { Image } from "expo-image";
import { StatusBar } from "expo-status-bar";
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const providers = [
  { name: "Apple", strategy: "oauth_apple", icon: require("../../assets/images/auth/apple.png") },
  { name: "Google", strategy: "oauth_google", icon: require("../../assets/images/auth/google.png") },
] as const;

export default function AuthScreen() {
  const { width, height, fontScale } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { isLoaded, isSignedIn } = useAuth();
  const { startSSOFlow } = useSSO();
  const inProgress = useRef(false);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function signIn(provider: (typeof providers)[number]) {
    if (!isLoaded || inProgress.current) return;
    inProgress.current = true;
    setPending(provider.name);
    setError("");
    try {
      const result = await startSSOFlow({
        strategy: provider.strategy,
        redirectUrl: makeRedirectUri({ scheme: "snaply", path: "auth" }),
      });
      if (result.createdSessionId && result.setActive) {
        await result.setActive({ session: result.createdSessionId });
      } else if (result.authSessionResult?.type !== "cancel" && result.authSessionResult?.type !== "dismiss") {
        setError("Sign-in was incomplete. Try again or choose another provider.");
      }
    } catch {
      setError(provider.name + " sign-in could not finish. Please try again.");
    } finally {
      inProgress.current = false;
      setPending(null);
    }
  }

  if (isSignedIn) return <Redirect href="/home" />;

  const scale = Math.min(width / 398, 1.22);
  const brandTop = Math.max(insets.top + 10, height * 0.084);
  const heroHeight = Math.max(height * 0.682, brandTop + 220 * scale * fontScale + 106 * scale);
  const radius = 34 * scale;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} bounces={false}>
      <StatusBar style="dark" />
      <View style={{ minHeight: heroHeight, paddingTop: brandTop, paddingHorizontal: 40 * scale }}>
        <Image
          source={require("../../assets/images/auth/hero.png")}
          contentFit="fill"
          style={[StyleSheet.absoluteFill, { bottom: -radius }]}
        />
        <View accessible accessibilityLabel="Snaply" style={[styles.brand, { gap: 11 * scale }]}>
          <Image source={require("../../assets/images/snaply-launch-mark.png")} style={{ width: 36 * scale, height: 36 * scale }} />
          <Text style={[styles.wordmark, { fontSize: 28 * scale }]}>Snaply</Text>
        </View>
        <Text accessibilityRole="header" style={[styles.heading, { marginTop: 21 * scale, marginRight: -22 * scale, fontSize: 30 * scale, lineHeight: 35 * scale }]}>
          {"Share Moments,\nDiscover People,\nConnect with the World."}
        </Text>
        <Text style={[styles.description, { marginTop: 11 * scale, fontSize: 18 * scale, lineHeight: 22 * scale }]}>
          {"A next-generation photo & video\nsharing community."}
        </Text>
      </View>
      <View style={[styles.sheet, { borderTopLeftRadius: radius, borderTopRightRadius: radius, paddingHorizontal: 23 * scale, paddingTop: 33 * scale, paddingBottom: Math.max(24, insets.bottom) }]}>
        {providers.map((provider) => (
          <Pressable
            key={provider.name}
            accessibilityRole="button"
            disabled={!isLoaded || pending !== null}
            accessibilityState={{ disabled: !isLoaded || pending !== null, busy: pending === provider.name }}
            onPress={() => signIn(provider)}
            style={({ pressed }) => [styles.button, provider.name === "Apple" ? styles.apple : styles.google, { minHeight: Math.max(44, 49 * scale), marginBottom: 11 * scale, opacity: pressed ? 0.8 : 1 }]}
          >
            <Image source={provider.icon} contentFit="contain" style={{ width: 28 * scale, height: 29 * scale }} />
            <Text style={[styles.buttonLabel, { fontSize: 17 * scale, color: provider.name === "Apple" ? "white" : "#090a11" }]}>{pending === provider.name ? "Connecting…" : "Continue with " + provider.name}</Text>
          </Pressable>
        ))}
        {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
        <Text style={[styles.legal, { fontSize: 14.5 * scale, lineHeight: 18 * scale, marginTop: 13 * scale }]}>
          {"By continuing, you agree to our\n"}
          <Text style={styles.link}>Terms of Service</Text> and <Text style={styles.link}>Privacy Policy</Text>
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f8f7fc" },
  content: { flexGrow: 1 },
  brand: { flexDirection: "row", alignItems: "center" },
  wordmark: { color: "#090b15", fontWeight: "800", letterSpacing: -1.1 },
  heading: { color: "#080b15", fontWeight: "800", letterSpacing: -0.85 },
  description: { color: "#6d778b", fontWeight: "500", letterSpacing: -0.3 },
  sheet: { flexGrow: 1, backgroundColor: "#f8f7fc" },
  button: { borderRadius: 100, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 15 },
  apple: { backgroundColor: "#111111" },
  google: { borderWidth: 1, borderColor: "#cfd1e4" },
  buttonLabel: { fontWeight: "700", letterSpacing: -0.45 },
  legal: { color: "#737b90", textAlign: "center", fontWeight: "500", letterSpacing: -0.3 },
  error: { color: "#922738", textAlign: "center", marginVertical: 6 },
  link: { color: "#5035ff", fontWeight: "600" },
});
