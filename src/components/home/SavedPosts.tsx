import { createContext, useContext, useState, type ReactNode } from "react";

const SavedPosts = createContext<{ ids: string[]; toggle: (id: string) => void } | null>(null);

export function SavedPostsProvider({ children }: { children: ReactNode }) {
  const [ids, setIds] = useState<string[]>([]);
  function toggle(id: string) {
    setIds(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id]);
  }
  return <SavedPosts.Provider value={{ ids, toggle }}>{children}</SavedPosts.Provider>;
}

export function useSavedPosts() {
  const saved = useContext(SavedPosts);
  if (!saved) throw new Error("Saved posts require the signed-in tab layout.");
  return saved;
}
