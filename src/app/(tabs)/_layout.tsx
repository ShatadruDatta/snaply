import { useAuth } from "@clerk/expo";
import { Redirect } from "expo-router";
import { NativeTabs } from "expo-router/native-tabs";
import { ActivityIndicator } from "react-native";

import { SavedPostsProvider } from "../../components/home/SavedPosts";

export const unstable_settings = { initialRouteName: "home" };

export default function TabLayout() {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) return <ActivityIndicator style={{ flex: 1 }} />;
  if (!isSignedIn) return <Redirect href="/auth" />;

  return (
    <SavedPostsProvider>
      <NativeTabs tintColor="#7535ff">
        <NativeTabs.Trigger name="home">
          <NativeTabs.Trigger.Icon sf="house.fill" md="home" />
          <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="explore">
          <NativeTabs.Trigger.Icon sf="magnifyingglass" md="search" />
          <NativeTabs.Trigger.Label>Explore</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="create">
          <NativeTabs.Trigger.Icon sf="plus.app" md="add_box" />
          <NativeTabs.Trigger.Label>Create</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="messages">
          <NativeTabs.Trigger.Icon sf="ellipsis.message" md="chat" />
          <NativeTabs.Trigger.Label>Messages</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="account">
          <NativeTabs.Trigger.Icon sf="person.crop.circle" md="account_circle" />
          <NativeTabs.Trigger.Label>Profile</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
      </NativeTabs>
    </SavedPostsProvider>
  );
}
