import { useMutation, useQuery } from "convex/react";
import { randomUUID } from "expo-crypto";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { api } from "../../../convex/_generated/api";

type Channel = "online" | "typing";

export function useChatPresence(handle: string, enabled: boolean) {
  const [active, setActive] = useState(false);
  const heartbeat = useMutation(api.chatPresence.heartbeat);
  const disconnect = useMutation(api.chatPresence.disconnect);
  const signal = useRef<() => void>(() => {});

  useFocusEffect(useCallback(() => {
    setActive(AppState.currentState === "active");
    const subscription = AppState.addEventListener("change", state => setActive(state === "active"));
    return () => {
      subscription.remove();
      setActive(false);
    };
  }, []));

  const connected = !!handle && enabled && active;
  const peer = useQuery(api.chatPresence.status, connected ? { handle } : "skip");
  useEffect(() => {
    if (!connected) return;
    const session = randomUUID();
    const tokens = new Map<Channel, string>();
    const pending = new Set<Channel>();
    let closed = false;
    let lastTyped = 0;
    const leave = (sessionToken: string) => {
      // The server also expires sessions when the app is suspended or offline.
      void disconnect({ sessionToken }).catch(() => {});
    };
    async function beat(channel: Channel) {
      if (pending.has(channel)) return;
      pending.add(channel);
      try {
        const token = await heartbeat({ handle, session, channel });
        if (closed) leave(token);
        else tokens.set(channel, token);
      } catch {
        // A later heartbeat can restore presence after reconnect.
      } finally {
        pending.delete(channel);
      }
    }
    signal.current = () => {
      if (Date.now() - lastTyped >= 1000) {
        lastTyped = Date.now();
        void beat("typing");
      }
    };
    void beat("online");
    const timer = setInterval(() => { void beat("online"); }, 10000);
    return () => {
      closed = true;
      clearInterval(timer);
      signal.current = () => {};
      for (const token of tokens.values()) leave(token);
    };
  }, [connected, disconnect, handle, heartbeat]);

  return { online: !!peer?.online, typing: !!peer?.typing, signalTyping: () => signal.current() };
}
