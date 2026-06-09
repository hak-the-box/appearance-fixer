import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export interface LibraryDocument {
  id: string;
  name: string;
  type: string;
  size: number; // bytes
  addedAt: number; // ms epoch
  dataUrl: string; // base64 data: URL
}

export interface ResearchEntry {
  id: string;
  query: string;
  category: "standard" | "comparison" | "howto" | "factcheck";
  sources: number;
  elapsedMs: number;
  createdAt: number;
  content?: string;
}

interface LibraryState {
  documents: LibraryDocument[];
  research: ResearchEntry[];
}

const STORAGE_KEY = "odysseus.library.v1";

const defaultState: LibraryState = { documents: [], research: [] };

interface LibraryContextValue extends LibraryState {
  addDocuments: (files: FileList | File[]) => Promise<void>;
  removeDocument: (id: string) => void;
  addResearch: (entry: Omit<ResearchEntry, "id" | "createdAt">) => void;
  removeResearch: (id: string) => void;
  clearAll: () => void;
}

const LibraryContext = createContext<LibraryContextValue | null>(null);

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function fileTypeLabel(file: File): string {
  if (file.type) return file.type.split("/")[1] ?? file.type;
  const ext = file.name.split(".").pop();
  return ext ?? "file";
}

const MAX_BYTES_PER_FILE = 5 * 1024 * 1024; // 5MB cap to keep localStorage healthy

export function LibraryProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<LibraryState>(defaultState);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setState({ ...defaultState, ...JSON.parse(raw) });
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* ignore quota */ }
  }, [state]);

  const value = useMemo<LibraryContextValue>(() => ({
    ...state,
    addDocuments: async (files) => {
      const list = Array.from(files);
      const next: LibraryDocument[] = [];
      for (const f of list) {
        if (f.size > MAX_BYTES_PER_FILE) {
          console.warn(`Skipped ${f.name} (over 5MB local-storage limit).`);
          continue;
        }
        const dataUrl = await fileToDataUrl(f);
        next.push({
          id: `doc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          name: f.name,
          type: fileTypeLabel(f),
          size: f.size,
          addedAt: Date.now(),
          dataUrl,
        });
      }
      if (next.length) setState((s) => ({ ...s, documents: [...next, ...s.documents] }));
    },
    removeDocument: (id) => setState((s) => ({ ...s, documents: s.documents.filter((d) => d.id !== id) })),
    addResearch: (entry) => setState((s) => ({
      ...s,
      research: [{ ...entry, id: `research-${Date.now()}`, createdAt: Date.now() }, ...s.research],
    })),
    removeResearch: (id) => setState((s) => ({ ...s, research: s.research.filter((r) => r.id !== id) })),
    clearAll: () => setState(defaultState),
  }), [state]);

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}

export function useLibrary(): LibraryContextValue {
  const ctx = useContext(LibraryContext);
  if (!ctx) throw new Error("useLibrary must be used inside <LibraryProvider>");
  return ctx;
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  const wk = Math.floor(day / 7);
  if (wk < 5) return `${wk}w ago`;
  return new Date(ts).toLocaleDateString();
}
