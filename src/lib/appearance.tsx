import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type SidebarKey =
  | "Brand"
  | "Search"
  | "New Chat"
  | "Chats"
  | "Brain"
  | "Deep Research"
  | "Library"
  | "Tasks"
  | "Theme";

export const SIDEBAR_KEYS: SidebarKey[] = [
  "Brand", "Search", "New Chat", "Chats",
  "Brain", "Deep Research", "Library", "Tasks", "Theme",
];

export interface ChatAreaPrefs {
  autoScroll: boolean;
  nobodyMode: boolean;
  soundEffects: boolean;
}

interface AppearanceState {
  sidebar: Record<SidebarKey, boolean>;
  chat: ChatAreaPrefs;
}

const defaultState: AppearanceState = {
  sidebar: Object.fromEntries(SIDEBAR_KEYS.map((k) => [k, true])) as Record<SidebarKey, boolean>,
  chat: { autoScroll: true, nobodyMode: false, soundEffects: false },
};

const STORAGE_KEY = "odysseus.appearance.v1";

interface AppearanceContextValue extends AppearanceState {
  setSidebarVisible: (key: SidebarKey, visible: boolean) => void;
  setChatPref: <K extends keyof ChatAreaPrefs>(key: K, value: ChatAreaPrefs[K]) => void;
  isSidebarVisible: (key: SidebarKey) => boolean;
}

const AppearanceContext = createContext<AppearanceContextValue | null>(null);

export function AppearanceProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppearanceState>(defaultState);

  // Hydrate from localStorage on client after mount (SSR-safe).
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<AppearanceState>;
      setState({
        sidebar: { ...defaultState.sidebar, ...(parsed.sidebar ?? {}) },
        chat: { ...defaultState.chat, ...(parsed.chat ?? {}) },
      });
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }, [state]);

  const value = useMemo<AppearanceContextValue>(
    () => ({
      ...state,
      setSidebarVisible: (key, visible) =>
        setState((s) => ({ ...s, sidebar: { ...s.sidebar, [key]: visible } })),
      setChatPref: (key, val) =>
        setState((s) => ({ ...s, chat: { ...s.chat, [key]: val } })),
      isSidebarVisible: (key) => state.sidebar[key] !== false,
    }),
    [state],
  );

  return <AppearanceContext.Provider value={value}>{children}</AppearanceContext.Provider>;
}

export function useAppearance(): AppearanceContextValue {
  const ctx = useContext(AppearanceContext);
  if (!ctx) throw new Error("useAppearance must be used inside <AppearanceProvider>");
  return ctx;
}
