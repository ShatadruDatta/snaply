import { ClerkProvider } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import { Stack } from "expo-router";
import { maybeCompleteAuthSession } from "expo-web-browser";

import { SessionProfileProvider } from "../components/profile/SessionProfile";

maybeCompleteAuthSession();

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;
export default function RootLayout() {
  if (!publishableKey) {
    throw new Error("Set EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY before starting Snaply.");
  }
  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <SessionProfileProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </SessionProfileProvider>
    </ClerkProvider>
  );
}
