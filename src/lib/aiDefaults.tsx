import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export interface AIDefaultsState {
  endpoint: string;
  chatModel: string;
  utilityModel: string;
  toolCallLimit: number;
  vision: boolean;
}

const STORAGE_KEY = "odysseus.aiDefaults.v1";

const defaultState: AIDefaultsState = {
  endpoint: "Ollama",
  chatModel: "gemma4:latest",
  utilityModel: "gemma4:latest",
  toolCallLimit: 10,
  vision: true,
};

interface AIDefaultsContextValue extends AIDefaultsState {
  set: <K extends keyof AIDefaultsState>(key: K, value: AIDefaultsState[K]) => void;
  reset: () => void;
}

const AIDefaultsContext = createContext<AIDefaultsContextValue | null>(null);

export function AIDefaultsProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AIDefaultsState>(defaultState);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setState({ ...defaultState, ...JSON.parse(raw) });
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* ignore */ }
  }, [state]);

  const value = useMemo<AIDefaultsContextValue>(() => ({
    ...state,
    set: (key, val) => setState((s) => ({ ...s, [key]: val })),
    reset: () => setState(defaultState),
  }), [state]);

  return <AIDefaultsContext.Provider value={value}>{children}</AIDefaultsContext.Provider>;
}

export function useAIDefaults(): AIDefaultsContextValue {
  const ctx = useContext(AIDefaultsContext);
  if (!ctx) throw new Error("useAIDefaults must be used inside <AIDefaultsProvider>");
  return ctx;
}
