import { useConvexAuth, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuth, useUser } from "@clerk/expo";
import { createContext, useContext, useState, type ReactNode } from "react";

export type Profile = { name: string; handle: string; bio: string; photo: string | null };
const Context = createContext<{ profile: Profile; save: (profile: Profile) => void } | null>(null);
export const defaultPortrait = require("../../../assets/images/profile/editor-portrait.png");

function Session({ children }: { children: ReactNode }) {
  const { user } = useUser();
  const [saved, save] = useState<Profile | null>(null);
  const name = user?.fullName || user?.username || "Snaply user";
  const { isAuthenticated } = useConvexAuth();
  const me = useQuery(api.social.me, isAuthenticated ? {} : "skip");
  const profile = { ...(saved ?? {
    name,
    handle: user?.username || name.toLowerCase().replace(/\s+/g, ""),
    bio: typeof user?.unsafeMetadata.bio === "string" ? user.unsafeMetadata.bio :
      "Traveller • Photographer • Tech Enthusiast\nCapturing places, people and moments around the world. 🌍",
  }), photo: me?.avatar ?? null };
  return <Context.Provider value={{ profile, save }}>{children}</Context.Provider>;
}

export function SessionProfileProvider({ children }: { children: ReactNode }) {
  const { sessionId } = useAuth();
  return <Session key={sessionId}>{children}</Session>;
}

export function useSessionProfile() {
  const value = useContext(Context);
  if (!value) throw new Error("Profile requires a session provider");
  return value;
}
