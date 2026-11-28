import { useAuth } from "@clerk/expo";
import { Redirect } from "expo-router";
import { ActivityIndicator } from "react-native";

import { SavedPostsProvider } from "../../components/home/SavedPosts";
import { GlassTabs } from "../../components/navigation/GlassTabs";
import { SocialSession } from "../../components/social/SocialSession";

export const unstable_settings = { anchor: "home" };

export default function TabLayout() {
  const { isLoaded, isSignedIn, sessionId } = useAuth();
  if (!isLoaded) return <ActivityIndicator style={{ flex: 1 }} />;
  if (!isSignedIn) return <Redirect href="/auth" />;

  return (
    <SocialSession key={sessionId}>
      <SavedPostsProvider>
        <GlassTabs />
      </SavedPostsProvider>
    </SocialSession>
  );
}
