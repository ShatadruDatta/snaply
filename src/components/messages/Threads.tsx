import { createContext, useCallback, useContext, useState, type PropsWithChildren } from "react";

type Message = { text: string; photo?: string; time: string };
type Threads = Record<string, Message[]>;
type ThreadState = {
  threads: Threads;
  opened: string[];
  markRead: (handle: string) => void;
  append: (handle: string, text: string, photo?: string) => void;
};

const Context = createContext<ThreadState | null>(null);

export function ThreadsProvider({ children }: PropsWithChildren) {
  const [threads, setThreads] = useState<Threads>({});
  const [opened, setOpened] = useState<string[]>([]);
  const markRead = useCallback((handle: string) => {
    setOpened(current => current.includes(handle) ? current : [...current, handle]);
  }, []);
  function append(handle: string, text: string, photo?: string) {
    const time = new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    setThreads(current => ({ ...current, [handle]: [...(current[handle] || []), { text, photo, time }] }));
  }
  return <Context.Provider value={{ threads, opened, markRead, append }}>{children}</Context.Provider>;
}

export function useThreads() {
  const value = useContext(Context);
  if (!value) throw new Error("Messages must be rendered inside ThreadsProvider");
  return value;
}
