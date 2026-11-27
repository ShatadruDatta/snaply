import { useUser } from "@clerk/expo";
import { useConvexAuth, useMutation } from "convex/react";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api } from "../../../convex/_generated/api";

const SocialConnection = createContext({ ready: false, message: "Connecting to Snaply…" });

export function SocialSession({ children }: { children: ReactNode }) {
  const { user, isLoaded } = useUser();
  const displayName = user?.fullName || user?.username || undefined;
  const preferredHandle = user?.username || undefined;
  const { isAuthenticated, isLoading } = useConvexAuth();
  const ensureProfile = useMutation(api.social.ensureProfile);
  const [profileState, setProfileState] = useState<"pending" | "ready" | "failed">("pending");

  useEffect(() => {
    let active = true;
    if (isAuthenticated && isLoaded) {
      ensureProfile({ displayName, preferredHandle }).then(
        () => { if (active) setProfileState("ready"); },
        () => { if (active) setProfileState("failed"); },
      );
    }
    return () => { active = false; };
  }, [isAuthenticated, isLoaded, ensureProfile, displayName, preferredHandle]);

  const ready = isAuthenticated && profileState === "ready";
  const message = profileState === "failed" || (!isLoading && !isAuthenticated)
    ? "Couldn’t connect your account to Snaply. Sign in again from Profile."
    : "Connecting to Snaply…";
  return <SocialConnection.Provider value={{ ready, message }}>{children}</SocialConnection.Provider>;
}

export function useSocialSession() {
  return useContext(SocialConnection);
}
