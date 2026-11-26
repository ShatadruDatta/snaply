import { Stack } from "expo-router";
import { ThreadsProvider } from "../../../components/messages/Threads";

export const unstable_settings = { initialRouteName: "index" };

export default function MessagesLayout() {
  return <ThreadsProvider><Stack screenOptions={{ headerShown: false }} /></ThreadsProvider>;
}
