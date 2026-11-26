import { Image } from "expo-image";
import { useAuth } from "@clerk/expo";
import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { StyleSheet, View } from "react-native";

export default function Index() {
  const [displayed, setDisplayed] = useState(false);

  const [elapsed, setElapsed] = useState(false);
  const { isLoaded, isSignedIn } = useAuth();

  useEffect(() => {
    if (!displayed) return;
    const timer = setTimeout(() => setElapsed(true), 3000);
    return () => clearTimeout(timer);
  }, [displayed]);

  if (elapsed && isLoaded) return <Redirect href={isSignedIn ? "/home" : "/auth"} />;

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <Image
        onDisplay={() => setDisplayed(true)}
        onError={() => setDisplayed(true)}
        accessible
        accessibilityLabel="Snaply. Share, discover, connect."
        source={require("../../assets/images/snaply-splash.png")}
        contentFit="cover"
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f6f2fc",
  },
});
