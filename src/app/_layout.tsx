import { ClerkProvider, useAuth } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { Stack } from "expo-router";
import { maybeCompleteAuthSession } from "expo-web-browser";

import { SessionProfileProvider } from "../components/profile/SessionProfile";

maybeCompleteAuthSession();

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;
const convex = new ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL!, { unsavedChangesWarning: false });

export default function RootLayout() {
  if (!publishableKey) {
    throw new Error("Set EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY before starting Snaply.");
  }
  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        <SessionProfileProvider>
          <Stack screenOptions={{ headerShown: false }} />
        </SessionProfileProvider>
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}
