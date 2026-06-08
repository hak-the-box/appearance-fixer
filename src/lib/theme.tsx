import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

/* ---------- Types ---------- */

export type ThemeMode = "dark" | "light";
export type FontFamily = "Monospace" | "Sans-serif" | "Serif";
export type Density = "Compact" | "Comfortable" | "Spacious";
export type BgEffect = "Solid" | "Dots" | "Synapse" | "Rain" | "Constellations";

export interface ThemeColors {
  background: string;
  foreground: string;
  card: string;
  panel: string;
  border: string;
  brand: string;
  accent: string;
  primary: string;
  input: string;
  muted: string;
  mutedForeground: string;
}

export interface ThemePreset {
  name: string;
  dark: ThemeColors;
  light: ThemeColors;
}

/* ---------- Built-in presets ---------- */

export const BUILT_IN_THEMES: ThemePreset[] = [
  {
    name: "Dracula",
    dark: {
      background: "#282a36", foreground: "#f8f8f2", card: "#21222c", panel: "#191a21",
      border: "#44475a", brand: "#bd93f9", accent: "#6272a4", primary: "#ff79c6",
      input: "#21222c", muted: "#44475a", mutedForeground: "#9ca0b0",
    },
    light: {
      background: "#f8f8f2", foreground: "#282a36", card: "#ffffff", panel: "#eeeef0",
      border: "#c8c9d3", brand: "#7c3aed", accent: "#9ca8d4", primary: "#d6336c",
      input: "#ffffff", muted: "#e6e7ee", mutedForeground: "#5c6075",
    },
  },
  {
    name: "Nord",
    dark: {
      background: "#2e3440", foreground: "#d8dee9", card: "#3b4252", panel: "#252a33",
      border: "#4c566a", brand: "#88c0d0", accent: "#81a1c1", primary: "#88c0d0",
      input: "#3b4252", muted: "#4c566a", mutedForeground: "#aeb6c4",
    },
    light: {
      background: "#eceff4", foreground: "#2e3440", card: "#ffffff", panel: "#e5e9f0",
      border: "#d8dee9", brand: "#5e81ac", accent: "#81a1c1", primary: "#5e81ac",
      input: "#ffffff", muted: "#e5e9f0", mutedForeground: "#5b6477",
    },
  },
  {
    name: "Solarized Dark",
    dark: {
      background: "#002b36", foreground: "#93a1a1", card: "#073642", panel: "#001f27",
      border: "#586e75", brand: "#b58900", accent: "#268bd2", primary: "#cb4b16",
      input: "#073642", muted: "#586e75", mutedForeground: "#839496",
    },
    light: {
      background: "#fdf6e3", foreground: "#586e75", card: "#ffffff", panel: "#eee8d5",
      border: "#d3cbb0", brand: "#b58900", accent: "#268bd2", primary: "#cb4b16",
      input: "#ffffff", muted: "#eee8d5", mutedForeground: "#657b83",
    },
  },
  {
    name: "Monokai",
    dark: {
      background: "#272822", foreground: "#f8f8f2", card: "#1e1f1c", panel: "#1c1d18",
      border: "#49483e", brand: "#f92672", accent: "#a6e22e", primary: "#fd971f",
      input: "#1e1f1c", muted: "#49483e", mutedForeground: "#a59f85",
    },
    light: {
      background: "#fafafa", foreground: "#272822", card: "#ffffff", panel: "#f0f0f0",
      border: "#d0d0d0", brand: "#d63384", accent: "#5a8f29", primary: "#e36209",
      input: "#ffffff", muted: "#e8e8e8", mutedForeground: "#6c6f78",
    },
  },
  {
    name: "One Dark",
    dark: {
      background: "#282c34", foreground: "#9cdef2", card: "#1a1a1e", panel: "#111111",
      border: "#355a66", brand: "#e06c75", accent: "#2d3f45", primary: "#e06c75",
      input: "#1e2228", muted: "#1e2228", mutedForeground: "#6b8a94",
    },
    light: {
      background: "#fafafa", foreground: "#1f2329", card: "#ffffff", panel: "#f3f4f6",
      border: "#d8dde3", brand: "#d63b48", accent: "#e3eaf0", primary: "#d63b48",
      input: "#ffffff", muted: "#eef0f3", mutedForeground: "#5c6470",
    },
  },
  {
    name: "Catppuccin",
    dark: {
      background: "#1e1e2e", foreground: "#cdd6f4", card: "#181825", panel: "#11111b",
      border: "#45475a", brand: "#f5c2e7", accent: "#89b4fa", primary: "#cba6f7",
      input: "#181825", muted: "#313244", mutedForeground: "#a6adc8",
    },
    light: {
      background: "#eff1f5", foreground: "#4c4f69", card: "#ffffff", panel: "#e6e9ef",
      border: "#ccd0da", brand: "#ea76cb", accent: "#1e66f5", primary: "#8839ef",
      input: "#ffffff", muted: "#dce0e8", mutedForeground: "#6c6f85",
    },
  },
];

export const DEFAULT_THEME_NAME = "One Dark";

const FONT_STACKS: Record<FontFamily, string> = {
  Monospace: '"Fira Code", "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
  "Sans-serif": '-apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  Serif: 'Georgia, "Iowan Old Style", "Palatino Linotype", "Times New Roman", serif',
};

const DENSITY_SCALE: Record<Density, number> = {
  Compact: 0.9,
  Comfortable: 1,
  Spacious: 1.1,
};

/* ---------- State ---------- */

export interface ThemeState {
  themeName: string;
  mode: ThemeMode;
  font: FontFamily;
  density: Density;
  bgEffect: BgEffect;
  bgIntensity: number; // 0-100
  bgSize: number; // 30-250
  customColors: Partial<ThemeColors>; // overrides
  customThemes: ThemePreset[];
}

const DEFAULT_STATE: ThemeState = {
  themeName: DEFAULT_THEME_NAME,
  mode: "dark",
  font: "Monospace",
  density: "Comfortable",
  bgEffect: "Solid",
  bgIntensity: 100,
  bgSize: 100,
  customColors: {},
  customThemes: [],
};

const STORAGE_KEY = "odysseus.theme.v1";

/* ---------- Context ---------- */

interface ThemeContextValue extends ThemeState {
  allThemes: ThemePreset[];
  activeColors: ThemeColors;
  setThemeName: (name: string) => void;
  setMode: (m: ThemeMode) => void;
  setFont: (f: FontFamily) => void;
  setDensity: (d: Density) => void;
  setBgEffect: (b: BgEffect) => void;
  setBgIntensity: (n: number) => void;
  setBgSize: (n: number) => void;
  setCustomColor: (key: keyof ThemeColors, value: string) => void;
  saveCustomTheme: (name: string) => void;
  importTheme: (json: string) => { ok: boolean; error?: string };
  exportTheme: () => string;
  reset: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}

/* ---------- Apply CSS variables ---------- */

function applyToDocument(state: ThemeState, colors: ThemeColors) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.style.setProperty("--background", colors.background);
  root.style.setProperty("--foreground", colors.foreground);
  root.style.setProperty("--card", colors.card);
  root.style.setProperty("--card-foreground", colors.foreground);
  root.style.setProperty("--popover", colors.panel);
  root.style.setProperty("--popover-foreground", colors.foreground);
  root.style.setProperty("--primary", colors.primary);
  root.style.setProperty("--primary-foreground", "#ffffff");
  root.style.setProperty("--secondary", colors.muted);
  root.style.setProperty("--secondary-foreground", colors.foreground);
  root.style.setProperty("--muted", colors.muted);
  root.style.setProperty("--muted-foreground", colors.mutedForeground);
  root.style.setProperty("--accent", colors.accent);
  root.style.setProperty("--accent-foreground", colors.foreground);
  root.style.setProperty("--border", colors.border);
  root.style.setProperty("--input", colors.input);
  root.style.setProperty("--ring", colors.brand);
  root.style.setProperty("--panel", colors.panel);
  root.style.setProperty("--panel-border", colors.border);
  root.style.setProperty("--brand", colors.brand);
  root.style.setProperty("--font-mono", FONT_STACKS[state.font]);
  root.style.fontSize = `${16 * DENSITY_SCALE[state.density]}px`;
  // light/dark class for any consumer that cares
  root.classList.toggle("dark", state.mode === "dark");
  root.classList.toggle("light", state.mode === "light");
  root.dataset.theme = state.themeName;
}

/* ---------- Provider ---------- */

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ThemeState>(DEFAULT_STATE);
  const [hydrated, setHydrated] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setState({ ...DEFAULT_STATE, ...parsed });
      }
    } catch {
      // ignore
    }
    setHydrated(true);
  }, []);

  const allThemes = useMemo(
    () => [...BUILT_IN_THEMES, ...state.customThemes],
    [state.customThemes],
  );

  const activePreset = useMemo(
    () => allThemes.find((t) => t.name === state.themeName) ?? allThemes[0],
    [allThemes, state.themeName],
  );

  const activeColors = useMemo<ThemeColors>(
    () => ({
      ...activePreset[state.mode],
      ...state.customColors,
    }),
    [activePreset, state.mode, state.customColors],
  );

  // Persist whenever state changes (after hydration)
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore
    }
  }, [state, hydrated]);

  // Apply colors to document
  useEffect(() => {
    applyToDocument(state, activeColors);
  }, [state, activeColors]);

  const setThemeName = useCallback((name: string) => {
    setState((s) => ({ ...s, themeName: name, customColors: {} }));
  }, []);
  const setMode = useCallback((m: ThemeMode) => setState((s) => ({ ...s, mode: m })), []);
  const setFont = useCallback((f: FontFamily) => setState((s) => ({ ...s, font: f })), []);
  const setDensity = useCallback((d: Density) => setState((s) => ({ ...s, density: d })), []);
  const setBgEffect = useCallback((b: BgEffect) => setState((s) => ({ ...s, bgEffect: b })), []);
  const setBgIntensity = useCallback((n: number) => setState((s) => ({ ...s, bgIntensity: n })), []);
  const setBgSize = useCallback((n: number) => setState((s) => ({ ...s, bgSize: n })), []);
  const setCustomColor = useCallback(
    (key: keyof ThemeColors, value: string) =>
      setState((s) => ({ ...s, customColors: { ...s.customColors, [key]: value } })),
    [],
  );

  const saveCustomTheme = useCallback(
    (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      setState((s) => {
        const base = allThemes.find((t) => t.name === s.themeName) ?? allThemes[0];
        const merged: ThemeColors = { ...base[s.mode], ...s.customColors };
        // store as a theme where both modes equal merged (user can later tweak)
        const newTheme: ThemePreset = {
          name: trimmed,
          dark: s.mode === "dark" ? merged : base.dark,
          light: s.mode === "light" ? merged : base.light,
        };
        const filtered = s.customThemes.filter((t) => t.name !== trimmed);
        return {
          ...s,
          customThemes: [...filtered, newTheme],
          themeName: trimmed,
          customColors: {},
        };
      });
    },
    [allThemes],
  );

  const exportTheme = useCallback(() => {
    return JSON.stringify(
      {
        themeName: state.themeName,
        mode: state.mode,
        colors: activeColors,
        font: state.font,
        density: state.density,
        bgEffect: state.bgEffect,
        bgIntensity: state.bgIntensity,
        bgSize: state.bgSize,
      },
      null,
      2,
    );
  }, [state, activeColors]);

  const importTheme = useCallback((json: string) => {
    try {
      const data = JSON.parse(json);
      if (!data || typeof data !== "object") return { ok: false, error: "Invalid JSON" };
      setState((s) => {
        const next = { ...s };
        if (typeof data.themeName === "string") next.themeName = data.themeName;
        if (data.mode === "dark" || data.mode === "light") next.mode = data.mode;
        if (typeof data.font === "string") next.font = data.font as FontFamily;
        if (typeof data.density === "string") next.density = data.density as Density;
        if (typeof data.bgEffect === "string") next.bgEffect = data.bgEffect as BgEffect;
        if (typeof data.bgIntensity === "number") next.bgIntensity = data.bgIntensity;
        if (typeof data.bgSize === "number") next.bgSize = data.bgSize;
        if (data.colors && typeof data.colors === "object") next.customColors = data.colors;
        return next;
      });
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Parse error" };
    }
  }, []);

  const reset = useCallback(() => setState(DEFAULT_STATE), []);

  const value: ThemeContextValue = {
    ...state,
    allThemes,
    activeColors,
    setThemeName,
    setMode,
    setFont,
    setDensity,
    setBgEffect,
    setBgIntensity,
    setBgSize,
    setCustomColor,
    saveCustomTheme,
    importTheme,
    exportTheme,
    reset,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/* ---------- Background Effect renderer ---------- */

export function BackgroundEffect() {
  const { bgEffect, bgIntensity, bgSize, activeColors } = useTheme();

  if (bgEffect === "Solid") return null;

  const opacity = Math.max(0, Math.min(1, bgIntensity / 100)) * 0.6;
  const size = bgSize;
  const color = activeColors.brand;

  if (bgEffect === "Dots") {
    return (
      <div
        aria-hidden
        style={{
          position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
          opacity,
          backgroundImage: `radial-gradient(circle, ${color} 1.2px, transparent 1.6px)`,
          backgroundSize: `${size}px ${size}px`,
        }}
      />
    );
  }

  if (bgEffect === "Constellations") {
    return (
      <div aria-hidden style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, opacity }}>
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: `radial-gradient(circle, ${color} 1.5px, transparent 2px)`,
          backgroundSize: `${size}px ${size}px`,
        }} />
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage:
            `linear-gradient(45deg, transparent calc(50% - 0.5px), ${color}33 calc(50% - 0.25px), ${color}33 calc(50% + 0.25px), transparent calc(50% + 0.5px))`,
          backgroundSize: `${size * 2}px ${size * 2}px`,
          opacity: 0.4,
        }} />
      </div>
    );
  }

  if (bgEffect === "Rain") {
    return (
      <>
        <style>{`@keyframes bgeff-rain { 0%{transform:translateY(-100%)} 100%{transform:translateY(100%)} }`}</style>
        <div aria-hidden style={{
          position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden", opacity,
        }}>
          <div style={{
            position: "absolute", inset: "-100% 0 -100% 0",
            backgroundImage: `repeating-linear-gradient(180deg, transparent 0 ${size * 0.6}px, ${color}55 ${size * 0.6}px ${size * 0.6 + 1}px)`,
            backgroundSize: `${size}px ${size}px`,
            animation: "bgeff-rain 6s linear infinite",
          }} />
        </div>
      </>
    );
  }

  if (bgEffect === "Synapse") {
    return (
      <>
        <style>{`@keyframes bgeff-syn { 0%,100%{opacity:.3} 50%{opacity:.9} }`}</style>
        <div aria-hidden style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, opacity }}>
          <div style={{
            position: "absolute", inset: 0,
            backgroundImage:
              `radial-gradient(circle at 20% 30%, ${color}55, transparent 40%),` +
              `radial-gradient(circle at 80% 70%, ${color}44, transparent 45%),` +
              `radial-gradient(circle at 50% 50%, ${color}33, transparent 50%)`,
            backgroundSize: `${size * 4}px ${size * 4}px`,
            animation: "bgeff-syn 6s ease-in-out infinite",
          }} />
        </div>
      </>
    );
  }

  return null;
}
