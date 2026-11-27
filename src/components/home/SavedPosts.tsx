import { createContext, useContext, useState, type ReactNode } from "react";

import type { Id } from "../../../convex/_generated/dataModel";

const SavedPosts = createContext<{ ids: Id<"posts">[]; toggle: (id: Id<"posts">) => void } | null>(null);

export function SavedPostsProvider({ children }: { children: ReactNode }) {
  const [ids, setIds] = useState<Id<"posts">[]>([]);
  function toggle(id: Id<"posts">) {
    setIds(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id]);
  }
  return <SavedPosts.Provider value={{ ids, toggle }}>{children}</SavedPosts.Provider>;
}

export function useSavedPosts() {
  const saved = useContext(SavedPosts);
  if (!saved) throw new Error("Saved posts require the signed-in tab layout.");
  return saved;
}
