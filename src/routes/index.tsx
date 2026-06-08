import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { sendChatMessage } from "@/lib/chat";
import { BackgroundEffect, useTheme, type ThemeColors } from "@/lib/theme";
import { useAppearance, SIDEBAR_KEYS, type SidebarKey } from "@/lib/appearance";

import {
  Plus, Search, Wrench, Brain as BrainIcon, Compass, Image as ImageIcon,
  BookOpen, ClipboardList, Palette, ChevronDown, ChevronUp, Eye, Minus, X,
  Mic, Terminal, CheckSquare, ArrowUp, Sparkles, Settings as SettingsIcon,
  Heart, Upload, Activity, Plus as PlusIcon, Pause, Play, MoreVertical,
  Pencil, Globe, Clock, Bookmark, Star, Trash2, Download, ChevronRight,
  Sliders, Sun, Moon, Monitor, Type, Maximize2, Paperclip, FileText, Database, StopCircle,
  MessageSquare,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Odysseus — Yours for the voyage" },
      { name: "description", content: "Your personal AI workspace." },
    ],
  }),
  component: Odysseus,
});

type PanelKey = "none" | "brain" | "tasks" | "theme" | "settings" | "deep" | "search" | "library";

interface Message {
  id: string;
  sender: "user" | "assistant";
  text: string;
  timestamp: string;
}

interface Chat {
  id: string;
  title: string;
  preview: string;
  date: string;
  messages: Message[];
}

const mockMemories = [
  { id: "mem-1", text: "The user's name is Dustin.", tags: ["pinned", "identity"], meta: "auto · 4× · 7h ago" },
  { id: "mem-2", text: "He lives in Belmont, Ohio.", tags: ["fact"], meta: "auto · 7h ago" },
  { id: "mem-3", text: "Prefers dark mode interface.", tags: ["preference"], meta: "auto · 1d ago" },
  { id: "mem-4", text: "Uses Ollama for local model running.", tags: ["environment"], meta: "auto · 3d ago" },
];

const mockFiles = [
  { id: "file-1", name: "api_docs.md", type: "markdown", size: "12 KB", date: "2 days ago" },
  { id: "file-2", name: "architecture_overview.txt", type: "text", size: "8 KB", date: "5 days ago" },
  { id: "file-3", name: "meeting_notes.pdf", type: "pdf", size: "245 KB", date: "1 week ago" },
  { id: "file-4", name: "schema.sql", type: "sql", size: "4 KB", date: "2 weeks ago" },
  { id: "file-5", name: "sunset_photo.png", type: "image", size: "1.8 MB", date: "3 days ago" },
  { id: "file-6", name: "beach_screenshot.webp", type: "image", size: "640 KB", date: "1 week ago" },
];

const initialChats: Chat[] = [
  {
    id: "chat-1",
    title: "How to configure API endpoints",
    preview: "To configure API endpoints, you need to edit the .env file and set the backend URL...",
    date: "2 hours ago",
    messages: [
      { id: "m1", sender: "user", text: "How do I configure my local model API endpoints?", timestamp: "2 hours ago" },
      { id: "m2", sender: "assistant", text: "To configure API endpoints, you need to open Settings (bottom left) and click the **Add Models** tab. Under **Local Endpoints**, you can add endpoints like `http://localhost:11434` for Ollama, LM Studio, or vLLM.", timestamp: "2 hours ago" }
    ]
  },
  {
    id: "chat-2",
    title: "Project planning session",
    preview: "We discussed the roadmap for Odysseus project, including vector database integration...",
    date: "Yesterday",
    messages: [
      { id: "m3", sender: "user", text: "What's the status of the vector database design?", timestamp: "1 day ago" },
      { id: "m4", sender: "assistant", text: "We've mapped out the database schema and decided to integrate ChromaDB as our local vector database for storing conversation embeddings and memory collections.", timestamp: "1 day ago" }
    ]
  },
  {
    id: "chat-3",
    title: "Deployment notes",
    preview: "Steps to deploy: 1. build project, 2. setup docker containers, 3. configure reverse proxy...",
    date: "3 days ago",
    messages: [
      { id: "m5", sender: "user", text: "Do you have the steps for production deployment?", timestamp: "3 days ago" },
      { id: "m6", sender: "assistant", text: "Yes, here are the deployment notes:\n1. Build the production bundle: `pnpm build`.\n2. Spin up the helper containers: Docker compose up.\n3. Configure reverse proxy (Nginx) to route traffic to the container.", timestamp: "3 days ago" }
    ]
  }
];

const BoatSVG = ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
  <svg className={className} style={style} viewBox="0 0 32 32" fill="none" aria-hidden="true">
    <path d="M16 4L16 22L6 22Z" fill="currentColor" />
    <path d="M16 8L16 22L24 22Z" fill="currentColor" opacity="0.6" />
    <path d="M4 24Q10 20 16 24Q22 28 28 24" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" />
  </svg>
);

function Odysseus() {
  const [activePanel, setActivePanel] = useState<PanelKey>("none");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [mode, setMode] = useState<"agent" | "chat">("agent");
  const [webSearch, setWebSearch] = useState(false);
  const [shellAccess, setShellAccess] = useState(false);
  const [planMode, setPlanMode] = useState(false);
  const [overflowOpen, setOverflowOpen] = useState(false);
  const [modelPickerOpen, setModelPickerOpen] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [inputTick, setInputTick] = useState(0);
  const [chats, setChats] = useState<Chat[]>(initialChats);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [chatsOpen, setChatsOpen] = useState(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const overflowRef = useRef<HTMLDivElement>(null);
  const modelPickerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeChat = chats.find((c) => c.id === activeChatId);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeChat?.messages]);

  const toggleSidebarCollapsed = () => setSidebarCollapsed((c) => !c);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "b" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        toggleSidebarCollapsed();
      }
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        togglePanel("search");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (overflowRef.current && !overflowRef.current.contains(e.target as Node)) {
        setOverflowOpen(false);
      }
      if (modelPickerRef.current && !modelPickerRef.current.contains(e.target as Node)) {
        setModelPickerOpen(false);
      }
    };
    const handlePaste = (e: ClipboardEvent) => {
      if (!e.clipboardData) return;
      const files: File[] = [];
      for (const item of e.clipboardData.items) {
        if (item.kind === "file") {
          const f = item.getAsFile();
          if (f) files.push(f);
        }
      }
      if (files.length > 0) addFiles(files);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("paste", handlePaste);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("paste", handlePaste);
    };
  }, []);

  const hasText = textareaRef.current ? textareaRef.current.value.trim().length > 0 : false; // updated via inputTick
  const hasFiles = pendingFiles.length > 0;

  const handleSend = () => {
    if (!hasText && !hasFiles) return;
    const userText = textareaRef.current?.value || "";
    if (textareaRef.current) textareaRef.current.value = "";
    if (textareaRef.current) { textareaRef.current.style.height = "auto"; }
    setPendingFiles([]);

    const newUserMessage: Message = {
      id: `msg-${Date.now()}`,
      sender: "user",
      text: userText,
      timestamp: "Just now"
    };

    let targetChatId = activeChatId;

    if (!targetChatId) {
      // Create a new chat session
      const newChatId = `chat-${Date.now()}`;
      const title = userText.length > 30 ? userText.substring(0, 30) + "..." : userText;
      const newChat: Chat = {
        id: newChatId,
        title: title,
        preview: userText,
        date: "Just now",
        messages: [newUserMessage]
      };
      setChats((prev) => [newChat, ...prev]);
      setActiveChatId(newChatId);
      targetChatId = newChatId;
    } else {
      // Append to existing chat
      setChats((prev) =>
        prev.map((c) => {
          if (c.id === targetChatId) {
            return {
              ...c,
              preview: userText,
              messages: [...c.messages, newUserMessage]
            };
          }
          return c;
        })
      );
    }

    // Fetch AI response from backend
    void sendChatMessage(userText).then((replyText) => {
      const assistantMessage: Message = {
        id: `msg-${Date.now() + 1}`,
        sender: "assistant",
        text: replyText,
        timestamp: "Just now",
      };
      setChats((prev) =>
        prev.map((c) =>
          c.id === targetChatId ? { ...c, messages: [...c.messages, assistantMessage] } : c
        )
      );
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !(e.nativeEvent as KeyboardEvent).isComposing) {
      e.preventDefault();
      handleSend();
    }
  };

  const addFiles = (files: FileList | File[]) => {
    const arr = Array.from(files).slice(0, 10);
    setPendingFiles((prev) => [...prev, ...arr].slice(0, 10));
  };

  const removeFile = (idx: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const getSendMode = () => {
    if (hasText || hasFiles) return "send";
    return "newchat";
  };

  const togglePanel = (k: PanelKey) => setActivePanel((p) => (p === k ? "none" : k));

  const panelMeta: Partial<Record<PanelKey, { title: string; icon: React.ReactNode; w: number; h: number }>> = {
    brain:    { title: "Brain",    icon: <BrainIcon className="h-4 w-4" style={{ color: "var(--brand)" }} />,    w: 580, h: 580 },
    tasks:    { title: "Tasks",    icon: <ClipboardList className="h-4 w-4" style={{ color: "var(--brand)" }} />, w: 620, h: 540 },
    theme:    { title: "Theme",    icon: <Palette className="h-4 w-4" style={{ color: "var(--brand)" }} />,       w: 640, h: 620 },
    settings: { title: "Settings", icon: <SettingsIcon className="h-4 w-4" style={{ color: "var(--brand)" }} />,  w: 560, h: 540 },
    deep:     { title: "Deep Research", icon: <Compass className="h-4 w-4" style={{ color: "var(--brand)" }} />,  w: 580, h: 520 },
    search:   { title: "Search",   icon: <Search className="h-4 w-4" style={{ color: "var(--brand)" }} />,        w: 540, h: 440 },
    library:  { title: "Library",  icon: <BookOpen className="h-4 w-4" style={{ color: "var(--brand)" }} />,      w: 600, h: 520 },
  };

  const topItems: { key: string; label: string; icon: React.ReactNode; }[] = [
    { key: "new",    label: "New Chat",       icon: <Plus className="h-4 w-4" style={{ color: "var(--brand)" }} /> },
    { key: "search", label: "Search",         icon: <Search className="h-4 w-4" /> },
  ];

  const toolItems: { key: PanelKey; label: string; icon: React.ReactNode; }[] = [
    { key: "brain",  label: "Brain",          icon: <BrainIcon className="h-4 w-4" /> },
    { key: "deep",   label: "Deep Research",  icon: <Compass className="h-4 w-4" /> },
    { key: "library",label: "Library",        icon: <BookOpen className="h-4 w-4" /> },
    { key: "tasks",  label: "Tasks",          icon: <ClipboardList className="h-4 w-4" /> },
    { key: "theme",  label: "Theme",          icon: <Palette className="h-4 w-4" /> },
  ];

  return (
    <div className="relative flex h-screen w-screen" style={{ backgroundColor: "var(--background)", color: "var(--foreground)" }}>
      <BackgroundEffect />
      {/* Fixed hamburger */}
      <button
        type="button"
        onClick={toggleSidebarCollapsed}
        className="fixed z-[210] flex h-[30px] w-[30px] items-center justify-center border-none bg-transparent p-0 transition-opacity hover:opacity-80"
        style={{ top: 12, left: 9, color: "var(--foreground)", opacity: 0.5 }}
        aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        aria-expanded={!sidebarCollapsed}
      >
        <svg width="16" height="12" viewBox="0 0 16 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="0" y1="1" x2="16" y2="1" />
          <line x1="0" y1="6" x2="16" y2="6" />
          <line x1="0" y1="11" x2="16" y2="11" />
        </svg>
      </button>

      {/* Sidebar */}
      <aside
        className={`relative z-10 flex shrink-0 flex-col transition-[width] duration-200 ease-linear ${sidebarCollapsed ? "w-12" : "w-56"}`}
        style={{ background: "var(--panel)", borderRight: "1px solid var(--border)", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
        data-collapsed={sidebarCollapsed ? "true" : "false"}
      >
        {!sidebarCollapsed && (
          <div
            className="flex shrink-0 items-center justify-end gap-2"
            style={{ padding: "15px 10px 0 40px", minHeight: 40 }}
          >
            <span className="select-none whitespace-nowrap text-base font-semibold" style={{ color: "var(--brand)", left: -10, position: "relative", top: 0 }}>
              Odysseus
            </span>
          </div>
        )}
        {sidebarCollapsed && <div className="shrink-0" style={{ minHeight: 40 }} aria-hidden="true" />}

        <nav className={`flex-1 overflow-y-auto scrollbar-thin py-1 ${sidebarCollapsed ? "px-1" : "px-2"}`} style={{ scrollbarWidth: "none" }}>
          {/* Top items (always visible) */}
          {topItems.map((item) => (
            <button
              key={item.key}
              title={sidebarCollapsed ? item.label : undefined}
              onClick={() => {
                if (item.key === "new") {
                  setActiveChatId(null);
                  setActivePanel("none");
                } else if (item.key === "search") {
                  togglePanel("search");
                }
              }}
              className={`nav-item flex w-full items-center rounded text-sm ${sidebarCollapsed ? "justify-center px-0 py-2" : "gap-2 px-2 py-2"}`}
              style={{ height: 29, boxSizing: "border-box", color: "var(--foreground)", opacity: 0.7 }}
            >
              <span className="flex shrink-0 items-center" style={{ opacity: 0.7 }}>{item.icon}</span>
              {!sidebarCollapsed && <span>{item.label}</span>}
            </button>
          ))}

          {sidebarCollapsed ? (
            <>
              <div className="my-1 mx-auto h-px w-6" style={{ background: "var(--border)" }} />
              <button
                title="Chats"
                onClick={() => togglePanel("search")}
                className="nav-item flex w-full items-center justify-center rounded px-0 py-2 text-sm"
                style={{
                  height: 29, boxSizing: "border-box",
                  color: "var(--foreground)",
                  opacity: 0.6,
                }}
              >
                <span className="flex shrink-0 items-center" style={{ opacity: 0.6 }}>
                  <MessageSquare className="h-4 w-4" />
                </span>
              </button>
              <div className="my-1 mx-auto h-px w-6" style={{ background: "var(--border)" }} />
              {toolItems.map((item) => (
                <button
                  key={item.key}
                  title={item.label}
                  onClick={() => togglePanel(item.key)}
                  className="nav-item flex w-full items-center justify-center rounded px-0 py-2 text-sm"
                  style={{
                    height: 29, boxSizing: "border-box",
                    color: "var(--foreground)",
                    opacity: activePanel === item.key ? 1 : 0.6,
                    background: activePanel === item.key ? "color-mix(in srgb, var(--primary) 12%, transparent)" : "transparent",
                  }}
                >
                  <span className="flex shrink-0 items-center" style={{ opacity: 0.6 }}>{item.icon}</span>
                </button>
              ))}
            </>
          ) : (
            <>
              {/* Chats section header */}
              <button
                onClick={() => setChatsOpen((v) => !v)}
                className="nav-item flex w-full items-center justify-between rounded px-2 py-2 text-sm"
                style={{ height: 29, boxSizing: "border-box", color: "var(--foreground)", opacity: 0.7, marginTop: 6 }}
              >
                <span className="flex items-center gap-2">
                  <span className="flex shrink-0 items-center" style={{ opacity: 0.7 }}>
                    <MessageSquare className="h-4 w-4" style={{ color: "var(--brand)" }} />
                  </span>
                  <span>Chats</span>
                </span>
                <span style={{ opacity: 0.4 }}>
                  {chatsOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                </span>
              </button>

              {/* Chat items (collapsible) */}
              {chatsOpen && (
                <div style={{ overflow: "hidden" }} className="mb-2 space-y-0.5">
                  {chats.map((chat) => (
                    <button
                      key={chat.id}
                      onClick={() => {
                        setActiveChatId(chat.id);
                        setActivePanel("none");
                      }}
                      className="nav-item flex w-full items-center gap-2 rounded px-2 py-2 text-left text-xs truncate"
                      style={{
                        height: 29, boxSizing: "border-box", paddingLeft: 28,
                        color: "var(--foreground)",
                        opacity: activeChatId === chat.id ? 1 : 0.6,
                        background: activeChatId === chat.id ? "color-mix(in srgb, var(--primary) 12%, transparent)" : "transparent",
                      }}
                    >
                      <Clock className="h-3.5 w-3.5 shrink-0" style={{ opacity: 0.6 }} />
                      <span className="truncate flex-1">{chat.title}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Tools section header */}
              <button
                onClick={() => setToolsOpen((v) => !v)}
                className="nav-item flex w-full items-center justify-between rounded px-2 py-2 text-sm"
                style={{ height: 29, boxSizing: "border-box", color: "var(--foreground)", opacity: 0.7, marginTop: 2 }}
              >
                <span className="flex items-center gap-2">
                  <span className="flex shrink-0 items-center" style={{ opacity: 0.7 }}>
                    <Wrench className="h-4 w-4" style={{ color: "var(--brand)" }} />
                  </span>
                  <span>Tools</span>
                </span>
                <span style={{ opacity: 0.4 }}>
                  {toolsOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                </span>
              </button>

              {/* Tool items (collapsible) */}
              {toolsOpen && (
                <div style={{ overflow: "hidden" }}>
                  {toolItems.map((item) => (
                    <button
                      key={item.key}
                      onClick={() => togglePanel(item.key)}
                      className="nav-item flex w-full items-center gap-2 rounded px-2 py-2 text-sm"
                      style={{
                        height: 29, boxSizing: "border-box", paddingLeft: 28,
                        color: "var(--foreground)",
                        opacity: activePanel === item.key ? 1 : 0.6,
                        background: activePanel === item.key ? "color-mix(in srgb, var(--primary) 12%, transparent)" : "transparent",
                      }}
                    >
                      <span className="flex shrink-0 items-center" style={{ opacity: 0.6 }}>{item.icon}</span>
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </nav>

        {/* User bar */}
        <div
          className={`flex shrink-0 items-center ${sidebarCollapsed ? "flex-col gap-2 py-3" : "justify-between"}`}
          style={{ padding: sidebarCollapsed ? "8px 4px" : "12px 12px", minHeight: 48, borderTop: "1px solid var(--border)" }}
        >
          <div
            title={sidebarCollapsed ? "admin" : undefined}
            className={`flex cursor-pointer items-center rounded-lg transition-colors hover:bg-[color-mix(in_srgb,var(--foreground)_6%,transparent)] ${sidebarCollapsed ? "justify-center p-1" : "min-w-0 flex-1 gap-2.5 px-2 py-1.5"}`}
          >
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold uppercase"
              style={{ background: "color-mix(in srgb, var(--foreground) 12%, transparent)", color: "var(--foreground)", opacity: 0.7 }}>
              A
            </div>
            {!sidebarCollapsed && (
              <span className="overflow-hidden text-ellipsis whitespace-nowrap text-[9.75px] font-medium" style={{ color: "var(--foreground)", opacity: 0.8 }}>
                admin
              </span>
            )}
          </div>
          <button
            onClick={() => togglePanel("settings")}
            className="flex shrink-0 cursor-pointer items-center justify-center rounded-lg border-none bg-transparent p-1.5 transition-all"
            style={{ color: "var(--foreground)", opacity: 0.35 }}
            aria-label="Settings"
            title={sidebarCollapsed ? "Settings" : undefined}
          >
            <SettingsIcon className="h-4 w-4" />
          </button>
        </div>
      </aside>

      {/* Main area */}
      <main className="relative z-10 flex flex-1 flex-col overflow-hidden">
        <div className="flex shrink-0 items-center justify-center" style={{ padding: "5px 0 0", minHeight: 25, position: "relative", zIndex: 2 }}>
          <button className="flex items-center gap-1 text-xs" style={{ color: "color-mix(in srgb, var(--foreground) 50%, transparent)" }}>
            New Chat <ChevronDown className="h-3 w-3" />
          </button>
        </div>

        {activeChat ? (
          <div className="flex-1 overflow-y-auto scrollbar-thin p-6 space-y-4 w-full max-w-3xl mx-auto flex flex-col justify-start">
            <div className="flex items-center gap-2 pb-4 border-b shrink-0" style={{ borderColor: "color-mix(in srgb, var(--border) 30%, transparent)" }}>
              <MessageSquare className="h-5 w-5 animate-pulse" style={{ color: "var(--brand)" }} />
              <div>
                <h2 className="text-base font-semibold" style={{ color: "var(--foreground)" }}>{activeChat.title}</h2>
                <p className="text-xs opacity-50">Active Session · {activeChat.messages.length} messages</p>
              </div>
            </div>
            
            <div className="flex-1 space-y-4 overflow-y-auto pr-1 py-4">
              {activeChat.messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className="max-w-[85%] rounded-xl px-4 py-2.5 text-sm whitespace-pre-wrap leading-relaxed shadow-sm"
                    style={{
                      background: msg.sender === "user"
                        ? "color-mix(in srgb, var(--primary) 12%, var(--card))"
                        : "var(--card)",
                      border: "1px solid color-mix(in srgb, var(--border) 60%, transparent)",
                      color: "var(--foreground)",
                    }}
                  >
                    <div className="text-[10px] opacity-40 mb-1 font-semibold tracking-wider uppercase">
                      {msg.sender === "user" ? "You" : "Odysseus"}
                    </div>
                    {msg.text}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </div>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center px-6">
            <div className="flex items-center gap-3">
              <BoatSVG className="h-10 w-10" style={{ color: "var(--brand)" }} />
              <h1 className="text-4xl font-bold tracking-tight"
                style={{
                  background: "linear-gradient(135deg, var(--brand), color-mix(in srgb, var(--brand) 60%, var(--foreground)))",
                  WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
                }}>
                Odysseus
              </h1>
            </div>
            <p className="mt-3 text-sm" style={{ color: "color-mix(in srgb, var(--foreground) 60%, transparent)" }}>
              Yours for the voyage.
            </p>
            <p className="mt-6 max-w-xs text-center text-xs" style={{ color: "color-mix(in srgb, var(--foreground) 40%, transparent)" }}>
              Tip: Drag and drop files onto the chat to attach them.
            </p>
            <button className="mt-6 flex items-center gap-1.5 rounded-full px-3 py-1 text-xs transition-colors hover:opacity-80"
              style={{ border: "1px solid var(--border)", color: "color-mix(in srgb, var(--foreground) 50%, transparent)" }}>
              <Eye className="h-3.5 w-3.5" /> Nobody
            </button>
          </div>
        )}

        {/* Prompt bar */}
        <div className="px-6 pb-6">
          <div className="chat-input-bar mx-auto max-w-3xl">
            {/* Textarea + model picker */}
            <div className="chat-input-top">
              <textarea
                ref={textareaRef}
                placeholder="Message Odysseus..."
                rows={1}
                className="block w-full resize-none bg-transparent text-sm outline-none"
                style={{ color: "var(--foreground)", minHeight: 24, maxHeight: 200, lineHeight: 1.5, padding: 0, border: "none", fontFamily: "inherit", transition: "height 0.12s ease-out" }}
                onInput={(e) => {
                  const el = e.currentTarget;
                  el.style.height = "auto";
                  el.style.height = Math.min(el.scrollHeight, 200) + "px";
                  setInputTick((t) => t + 1);
                }}
                onKeyDown={handleKeyDown}
              />
              {/* Model picker */}
              <div className="model-picker-wrap" ref={modelPickerRef}>
                <button type="button" className="model-picker-btn" onClick={() => setModelPickerOpen((v) => !v)} title="Switch model">
                  <Sparkles className="h-3.5 w-3.5" style={{ color: "var(--brand)" }} />
                  <span id="model-picker-label">gemma4:latest</span>
                  <ChevronDown className="h-3 w-3" />
                </button>
                {modelPickerOpen && (
                  <div className="model-picker-menu">
                    <div className="model-picker-search-row">
                      <input type="text" placeholder="Search models..." autoFocus className="model-picker-search" />
                      <button type="button" className="model-picker-action-btn primary" title="Add model endpoints">
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                    <div className="model-picker-list">
                      <div className="mp-group-label">Favorites</div>
                      <div className="mp-item active">gemma4:latest <span className="mp-provider">Ollama</span></div>
                      <div className="mp-item">llama3.2:3b <span className="mp-provider">Ollama</span></div>
                      <div className="mp-group-label">Recent</div>
                      <div className="mp-item">mistral:7b <span className="mp-provider">Ollama</span></div>
                      <div className="mp-group-label">Ollama</div>
                      <div className="mp-item">nomic-embed-text:latest <span className="mp-provider">Ollama</span></div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            {/* Attach strip */}
            <div id="attach-strip" className="attach-strip" style={{ display: pendingFiles.length === 0 ? "none" : "flex" }}>
              {pendingFiles.map((f, i) => (
                <div key={i} className={`thumb ${f.type?.startsWith("image/") ? "thumb-image" : ""}`}>
                  {f.type?.startsWith("image/") ? (
                    <img className="thumb-img" src={URL.createObjectURL(f)} alt={f.name} />
                  ) : (
                    <span>{f.name}</span>
                  )}
                  <button className="thumb-x" onClick={() => removeFile(i)} aria-label="Remove attachment">×</button>
                </div>
              ))}
              {pendingFiles.length > 3 && (
                <div className="thumb thumb-collapsed" title={pendingFiles.map(f => f.name).join("\n")}>
                  <span>{pendingFiles.length} files</span>
                </div>
              )}
            </div>
            {/* Bottom bar */}
            <div className="chat-input-bottom">
              <div className="chat-input-left">
                {/* Overflow menu */}
                <div className="overflow-wrapper" ref={overflowRef}>
                  <button type="button" className={`input-icon-btn overflow-plus-btn ${overflowOpen ? "expanded" : ""}`}
                    onClick={() => setOverflowOpen((v) => !v)} title="More tools" aria-haspopup="true">
                    <ChevronUp className="h-4 w-4" />
                  </button>
                  {overflowOpen && (
                    <div id="overflow-menu" className="overflow-menu">
                      <button type="button" className="overflow-menu-item" onClick={() => { if (fileInputRef.current) { fileInputRef.current.removeAttribute("accept"); fileInputRef.current.click(); } setOverflowOpen(false); }}>
                        <Paperclip className="h-4 w-4" /><span>Attach file</span>
                      </button>
                      <button type="button" className="overflow-menu-item" onClick={() => { if (fileInputRef.current) { fileInputRef.current.setAttribute("accept", "image/*"); fileInputRef.current.click(); } setOverflowOpen(false); }}>
                        <FileText className="h-4 w-4" /><span>Attach image</span>
                      </button>
                    </div>
                  )}
                </div>
                {/* Web search toggle */}
                <button type="button" className={`input-icon-btn ${webSearch ? "active" : ""}`}
                  onClick={() => setWebSearch((v) => !v)} title="Web search" aria-pressed={webSearch}>
                  <Search className="h-4 w-4" />
                </button>
                {/* Shell toggle */}
                <button type="button" className={`input-icon-btn ${shellAccess ? "active" : ""}`}
                  onClick={() => setShellAccess((v) => !v)} title="Shell Access" aria-pressed={shellAccess}>
                  <Terminal className="h-4 w-4" />
                </button>
                {/* Plan mode toggle */}
                <button type="button" className={`input-icon-btn ${planMode ? "active" : ""}`}
                  onClick={() => setPlanMode((v) => !v)} title="Plan mode — investigate read-only, then propose a plan to approve">
                  <CheckSquare className="h-4 w-4" />
                </button>
              </div>
              <div className="chat-input-right">
                {/* Agent / Chat mode toggle */}
                <div className={`mode-toggle ${mode === "chat" ? "mode-chat" : ""}`}>
                  <button type="button" className={`mode-toggle-btn ${mode === "agent" ? "active" : ""}`}
                    id="mode-agent-btn" onClick={() => setMode("agent")} aria-pressed={mode === "agent"}>Agent</button>
                  <button type="button" className={`mode-toggle-btn ${mode === "chat" ? "active" : ""}`}
                    id="mode-chat-btn" onClick={() => setMode("chat")} aria-pressed={mode === "chat"}>Chat</button>
                </div>
                {/* Send button */}
                <button type="submit" className={`send-btn ${getSendMode() === "newchat" ? "newchat-mode" : ""}`}
                  data-mode={getSendMode()} onClick={handleSend} aria-label={getSendMode() === "newchat" ? "New chat" : "Send message"}>
                  {getSendMode() === "newchat" ? (
                    <Plus className="h-4 w-4" />
                  ) : (
                    <ArrowUp className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
          {/* Hidden file input */}
          <input ref={fileInputRef} type="file" id="file-input" className="hidden" multiple style={{ display: "none" }}
            onChange={(e) => { if (e.target.files) { addFiles(e.target.files); e.target.value = ""; } }} />
        </div>
      </main>

      {/* Active floating panel */}
      {activePanel !== "none" && (() => {
        const m = panelMeta[activePanel]!;
        const topOffsets: Partial<Record<PanelKey, number>> = { brain: 24, tasks: 60, theme: 24, settings: 80, deep: 40, search: 80, library: 60 };
        const rightOffsets: Partial<Record<PanelKey, number>> = { brain: 24, tasks: 640, theme: 160, settings: 280, deep: 60, search: 120, library: 80 };
        return (
          <Panel
            title={m.title}
            icon={m.icon}
            initial={{ top: topOffsets[activePanel]!, right: rightOffsets[activePanel]!, width: m.w, height: m.h }}
            onClose={() => setActivePanel("none")}
          >
            {activePanel === "brain" && <BrainPanel />}
            {activePanel === "tasks" && <TasksPanel />}
            {activePanel === "theme" && <ThemePanel />}
            {activePanel === "settings" && <SettingsPanel />}
            {activePanel === "deep" && <DeepResearchPanel />}
            {activePanel === "search" && (
              <SearchPanel
                chats={chats}
                onSelectChat={(id) => {
                  setActiveChatId(id);
                  setActivePanel("none");
                }}
                memories={mockMemories}
                files={mockFiles}
              />
            )}
            {activePanel === "library" && <LibraryPanel />}
          </Panel>
        );
      })()}
    </div>
  );
}

function IconBtn({ children }: { children: React.ReactNode }) {
  return (
    <button className="flex h-7 w-7 items-center justify-center rounded-md transition-colors" style={{ color: "inherit", opacity: 0.6 }}
      onMouseEnter={(e) => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.background = "color-mix(in srgb, var(--primary) 8%, transparent)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.opacity = "0.6"; e.currentTarget.style.background = "transparent"; }}>
      {children}
    </button>
  );
}

/* ---------- Panel (floating modal) ---------- */

function Panel({ title, icon, subtitle, initial, onClose, children }: {
  title: string; icon: React.ReactNode; subtitle?: string;
  initial: { top?: number; left?: number; right?: number; width: number; height: number };
  onClose: () => void; children: React.ReactNode;
}) {
  const [pos, setPos] = useState({
    top: initial.top ?? 80,
    left: initial.left ?? (initial.right !== undefined ? window.innerWidth - initial.right - initial.width : 200),
  });
  const [minimized, setMinimized] = useState(false);

  const onMouseDown = (e: React.MouseEvent) => {
    const startX = e.clientX, startY = e.clientY;
    const startTop = pos.top, startLeft = pos.left;
    const move = (ev: MouseEvent) => { setPos({ top: startTop + ev.clientY - startY, left: startLeft + ev.clientX - startX }); };
    const up = () => { window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up); };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  };

  return (
    <div className="absolute z-30 flex flex-col rounded-xl shadow-2xl" style={{
      top: pos.top, left: pos.left, width: initial.width, height: minimized ? 44 : initial.height,
      background: "var(--panel)", border: "1px solid var(--border)", backdropFilter: "blur(10px)",
    }}>
      <div onMouseDown={onMouseDown} className="flex cursor-move items-center justify-between px-3 py-2"
        style={{ borderBottom: minimized ? "none" : "1px solid color-mix(in srgb, var(--border) 60%, transparent)" }}>
        <div className="flex items-center gap-2 text-sm">
          {icon}
          <span className="font-medium" style={{ color: "var(--foreground)" }}>{title}</span>
          {subtitle && <span className="text-xs" style={{ color: "color-mix(in srgb, var(--foreground) 50%, transparent)" }}>{subtitle}</span>}
        </div>
        <div className="flex items-center gap-1" style={{ color: "color-mix(in srgb, var(--foreground) 50%, transparent)" }}>
          <button onClick={() => setMinimized((m) => !m)}
            className="flex h-6 w-6 items-center justify-center rounded transition-colors"
            style={{ border: "1px solid var(--foreground)", color: "var(--foreground)", background: "var(--background)" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--foreground)"; e.currentTarget.style.color = "var(--background)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "var(--background)"; e.currentTarget.style.color = "var(--foreground)"; }}>
            <Minus className="h-3.5 w-3.5" />
          </button>
          <button onClick={onClose}
            className="flex h-6 w-6 items-center justify-center rounded transition-colors"
            style={{ border: "1px solid var(--foreground)", color: "var(--foreground)", background: "var(--background)" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--foreground)"; e.currentTarget.style.color = "var(--background)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "var(--background)"; e.currentTarget.style.color = "var(--foreground)"; }}>
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      {!minimized && <div className="flex-1 overflow-hidden">{children}</div>}
    </div>
  );
}

/* ---------- Shared Components ---------- */

function Toggle({ on, onChange }: { on?: boolean; onChange?: (v: boolean) => void }) {
  const [internal, setInternal] = useState(!!on);
  const isControlled = onChange !== undefined;
  const v = isControlled ? !!on : internal;
  const toggle = () => {
    const next = !v;
    if (isControlled) onChange!(next);
    else setInternal(next);
  };
  return (
    <button onClick={toggle} className="relative h-5 w-9 rounded-full p-0.5 transition-colors"
      style={{ background: v ? "var(--brand)" : "color-mix(in srgb, var(--foreground) 20%, transparent)" }}>
      <span className={`block h-4 w-4 rounded-full bg-white transition-transform ${v ? "translate-x-4" : ""}`} />
    </button>
  );
}

function Chip({ children, active, onClick }: { children: React.ReactNode; active?: boolean; onClick?: () => void }) {
  const Tag = onClick ? "button" : "span";
  return (
    <Tag onClick={onClick} className="rounded-full px-2 py-0.5 text-[11px] outline-none transition-all"
      style={{
        background: active ? "color-mix(in srgb, var(--brand) 20%, transparent)" : "color-mix(in srgb, var(--foreground) 8%, transparent)",
        color: active ? "var(--brand)" : "color-mix(in srgb, var(--foreground) 50%, transparent)",
        cursor: onClick ? "pointer" : "default",
        border: "none",
      }}>
      {children}
    </Tag>
  );
}

function MemoryCard({ pinned, text, tags, meta }: { pinned?: boolean; text: string; tags: string[]; meta: string }) {
  return (
    <div className="rounded-md p-3"
      style={{
        border: pinned ? "1px solid color-mix(in srgb, var(--brand) 40%, transparent)" : "1px solid color-mix(in srgb, var(--border) 60%, transparent)",
        background: pinned ? "color-mix(in srgb, var(--brand) 5%, transparent)" : "color-mix(in srgb, var(--card) 40%, transparent)",
      }}>
      <div className="text-sm">{text}</div>
      <div className="mt-1.5 flex items-center gap-1.5 text-[10px]">
        {tags.map((t) => (
          <span key={t} className="rounded px-1.5 py-0.5"
            style={{
              background: t === "pinned" ? "color-mix(in srgb, var(--brand) 20%, transparent)" : "color-mix(in srgb, var(--foreground) 8%, transparent)",
              color: t === "pinned" ? "var(--brand)" : "color-mix(in srgb, var(--foreground) 50%, transparent)",
            }}>{t}</span>
        ))}
        <span className="ml-auto" style={{ color: "color-mix(in srgb, var(--foreground) 44%, transparent)" }}>{meta}</span>
      </div>
    </div>
  );
}

/* ---------- Brain ---------- */

function BrainPanel() {
  const tabs = ["Memories", "Skills", "Add", "Settings"];
  const [tab, setTab] = useState("Memories");
  const [autoMemory, setAutoMemory] = useState(true);
  const [autoSkills, setAutoSkills] = useState(true);
  const [injectSkills, setInjectSkills] = useState(true);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-5 px-4 pt-2" style={{ borderBottom: "1px solid color-mix(in srgb, var(--border) 60%, transparent)" }}>
        {tabs.map((t) => (
          <button key={t} onClick={() => setTab(t)} className="relative pb-2 text-sm transition-colors"
            style={{ color: tab === t ? "var(--brand)" : "color-mix(in srgb, var(--foreground) 50%, transparent)" }}>
            <span className="flex items-center gap-1">
              {t === "Memories" && <Sparkles className="h-3.5 w-3.5" />}
              {t === "Skills" && <Sparkles className="h-3.5 w-3.5" />}
              {t === "Add" && <Plus className="h-3.5 w-3.5" />}
              {t === "Settings" && <SettingsIcon className="h-3.5 w-3.5" />}
              {t}
              {t === "Memories" && <span className="text-[10px]" style={{ color: "color-mix(in srgb, var(--foreground) 38%, transparent)" }}>2</span>}
              {t === "Skills" && <span className="text-[10px]" style={{ color: "color-mix(in srgb, var(--foreground) 38%, transparent)" }}>0</span>}
            </span>
            {tab === t && <span className="absolute -bottom-px left-0 right-0 h-px" style={{ background: "var(--brand)" }} />}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin p-4">
        {tab === "Memories" && (
          <>
            <div className="mb-3 flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                  Memories <span className="ml-1 text-xs" style={{ color: "color-mix(in srgb, var(--foreground) 38%, transparent)" }}>2 memories</span>
                </div>
                <p className="mt-1 text-xs" style={{ color: "color-mix(in srgb, var(--foreground) 50%, transparent)" }}>
                  Long-term facts the AI remembers across chats — recall, edit, or curate.
                </p>
              </div>
              <Toggle on />
            </div>
            <div className="mb-3 flex items-center gap-2 text-xs">
              <select className="rounded-md px-2 py-1 outline-none"
                style={{ border: "1px solid color-mix(in srgb, var(--border) 70%, transparent)", background: "var(--input)", color: "var(--foreground)" }}>
                <option>Newest</option><option>Oldest</option>
              </select>
              <button className="rounded-md px-2 py-1 transition-colors hover:opacity-80"
                style={{ border: "1px solid color-mix(in srgb, var(--border) 70%, transparent)", color: "color-mix(in srgb, var(--foreground) 50%, transparent)" }}>Select</button>
              <button className="ml-auto flex items-center gap-1 rounded-md px-2 py-1 transition-colors hover:opacity-80"
                style={{ border: "1px solid color-mix(in srgb, var(--border) 70%, transparent)", color: "color-mix(in srgb, var(--foreground) 50%, transparent)" }}>
                <Sparkles className="h-3 w-3" /> Tidy
              </button>
            </div>
            <div className="mb-3 flex items-center gap-2 rounded-md px-2 py-1.5 text-xs"
              style={{ border: "1px solid color-mix(in srgb, var(--border) 70%, transparent)", background: "var(--input)" }}>
              <Search className="h-3.5 w-3.5" style={{ color: "color-mix(in srgb, var(--foreground) 50%, transparent)" }} />
              <input placeholder="Search memories…" className="flex-1 bg-transparent outline-none placeholder:opacity-60" style={{ color: "var(--foreground)" }} />
            </div>
            <div className="mb-3 flex flex-wrap gap-1.5">
              <Chip active>all</Chip><Chip>fact</Chip><Chip>identity</Chip>
            </div>
            <div className="space-y-2">
              <MemoryCard pinned text="The user's name is Dustin." tags={["pinned", "identity"]} meta="auto · 4× · 7h ago" />
              <MemoryCard text="He lives in Belmont, Ohio." tags={["fact"]} meta="auto · 7h ago" />
            </div>
          </>
        )}

        {tab === "Skills" && (
          <div>
            <div className="mb-3 flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                  Skills <span className="ml-1 text-xs" style={{ color: "color-mix(in srgb, var(--foreground) 38%, transparent)" }}>0 skills</span>
                </div>
                <p className="mt-1 text-xs" style={{ color: "color-mix(in srgb, var(--foreground) 50%, transparent)" }}>
                  Reusable procedures the AI can call via /skill — sort by confidence to surface the proven ones.
                </p>
              </div>
              <Toggle />
            </div>
            <div className="mb-3 flex items-center gap-2 text-xs">
              <select className="rounded-md px-2 py-1 outline-none"
                style={{ border: "1px solid color-mix(in srgb, var(--border) 70%, transparent)", background: "var(--input)", color: "var(--foreground)" }}>
                <option>Confidence</option><option>Most used</option><option>A-Z</option>
              </select>
              <button className="rounded-md px-2 py-1 transition-colors hover:opacity-80"
                style={{ border: "1px solid color-mix(in srgb, var(--border) 70%, transparent)", color: "color-mix(in srgb, var(--foreground) 50%, transparent)" }}>Select</button>
              <button className="ml-auto flex items-center gap-1 rounded-md px-2 py-1 transition-colors hover:opacity-80"
                style={{ border: "1px solid color-mix(in srgb, var(--border) 70%, transparent)", color: "color-mix(in srgb, var(--foreground) 50%, transparent)" }}>
                <Sparkles className="h-3 w-3" /> Audit all
              </button>
            </div>
            <div className="mb-3 flex items-center gap-2 rounded-md px-2 py-1.5 text-xs"
              style={{ border: "1px solid color-mix(in srgb, var(--border) 70%, transparent)", background: "var(--input)" }}>
              <Search className="h-3.5 w-3.5" style={{ color: "color-mix(in srgb, var(--foreground) 50%, transparent)" }} />
              <input placeholder="Search skills…" className="flex-1 bg-transparent outline-none" style={{ color: "var(--foreground)" }} />
            </div>
            <div className="flex h-32 items-center justify-center rounded-md border border-dashed"
              style={{ borderColor: "color-mix(in srgb, var(--border) 70%, transparent)", color: "color-mix(in srgb, var(--foreground) 30%, transparent)" }}>
              <p className="text-xs">No skills yet. Add one in the Add tab.</p>
            </div>
          </div>
        )}

        {tab === "Add" && (
          <div>
            {/* Add Memory */}
            <div className="mb-4 rounded-md p-3" style={{ border: "1px solid color-mix(in srgb, var(--border) 60%, transparent)", background: "var(--card)" }}>
              <div className="mb-2 flex items-center gap-2">
                <BrainIcon className="h-4 w-4" style={{ color: "var(--brand)" }} />
                <span className="text-sm font-semibold">Add Memory</span>
              </div>
              <p className="mb-2 text-xs" style={{ color: "color-mix(in srgb, var(--foreground) 50%, transparent)" }}>
                Import a .txt, .md, .pdf, .csv, or .json file — the AI reads it and suggests candidate memories.
              </p>
              <div className="flex gap-2">
                <input placeholder="e.g. 'I prefer concise replies'" className="flex-1 rounded-md px-2 py-1.5 text-xs outline-none"
                  style={{ border: "1px solid color-mix(in srgb, var(--border) 70%, transparent)", background: "var(--input)", color: "var(--foreground)" }} />
                <button className="rounded-md px-3 py-1.5 text-xs text-white" style={{ background: "var(--brand)" }}>Add</button>
              </div>
              <div className="mt-2 flex gap-1">
                <button className="flex items-center gap-1 rounded-md px-2 py-1 text-[10px] transition-colors"
                  style={{ border: "1px solid color-mix(in srgb, var(--border) 70%, transparent)", color: "color-mix(in srgb, var(--foreground) 50%, transparent)" }}>
                  <Upload className="h-3 w-3" /> Import
                </button>
                <button className="flex items-center gap-1 rounded-md px-2 py-1 text-[10px] transition-colors"
                  style={{ border: "1px solid color-mix(in srgb, var(--border) 70%, transparent)", color: "color-mix(in srgb, var(--foreground) 50%, transparent)" }}>
                  <Download className="h-3 w-3" /> Export
                </button>
              </div>
            </div>

            {/* Add Skill */}
            <div className="rounded-md p-3" style={{ border: "1px solid color-mix(in srgb, var(--border) 60%, transparent)", background: "var(--card)" }}>
              <div className="mb-2 flex items-center gap-2">
                <Sparkles className="h-4 w-4" style={{ color: "var(--brand)" }} />
                <span className="text-sm font-semibold">Add Skill</span>
              </div>
              <p className="mb-2 text-xs" style={{ color: "color-mix(in srgb, var(--foreground) 50%, transparent)" }}>
                Import from GitHub or create a skill by hand — title, what it solves, and an approach.
              </p>
              <div className="mb-2 flex gap-2">
                <input placeholder="Import URL — GitHub tree link to a skill folder" className="flex-1 rounded-md px-2 py-1.5 text-xs outline-none"
                  style={{ border: "1px solid color-mix(in srgb, var(--border) 70%, transparent)", background: "var(--input)", color: "var(--foreground)" }} />
                <button className="rounded-md px-3 py-1.5 text-xs text-white" style={{ background: "var(--brand)" }}>Import</button>
              </div>
              <div className="space-y-2">
                <input placeholder="Title — short name, e.g. 'build-vllm-wheel'" className="w-full rounded-md px-2 py-1.5 text-xs outline-none"
                  style={{ border: "1px solid color-mix(in srgb, var(--border) 70%, transparent)", background: "var(--input)", color: "var(--foreground)" }} />
                <input placeholder="When to use — what problem does this skill solve?" className="w-full rounded-md px-2 py-1.5 text-xs outline-none"
                  style={{ border: "1px solid color-mix(in srgb, var(--border) 70%, transparent)", background: "var(--input)", color: "var(--foreground)" }} />
                <textarea placeholder="How — the approach, steps, commands, or rules to follow" rows={2} className="w-full rounded-md px-2 py-1.5 text-xs outline-none resize-y"
                  style={{ border: "1px solid color-mix(in srgb, var(--border) 70%, transparent)", background: "var(--input)", color: "var(--foreground)" }} />
                <div className="flex justify-end">
                  <button className="rounded-md px-3 py-1.5 text-xs text-white" style={{ background: "var(--brand)" }}>Add Skill</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === "Settings" && (
          <div className="space-y-3">
            <div className="rounded-md p-3" style={{ border: "1px solid color-mix(in srgb, var(--border) 60%, transparent)", background: "var(--card)" }}>
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold">Auto-extract memories</span>
                <Toggle on={autoMemory} />
              </div>
              <p className="mt-1.5 text-xs" style={{ color: "color-mix(in srgb, var(--foreground) 50%, transparent)" }}>
                Automatically extract memories from conversations.
              </p>
            </div>
            <div className="rounded-md p-3" style={{ border: "1px solid color-mix(in srgb, var(--border) 60%, transparent)", background: "var(--card)" }}>
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold">Auto-extract skills</span>
                <Toggle on={autoSkills} />
              </div>
              <p className="mt-1.5 text-xs" style={{ color: "color-mix(in srgb, var(--foreground) 50%, transparent)" }}>
                Automatically draft reusable skills from your workflows.
              </p>
            </div>
            <div className="rounded-md p-3" style={{ border: "1px solid color-mix(in srgb, var(--border) 60%, transparent)", background: "var(--card)" }}>
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold">Inject Skills</span>
                <Toggle on={injectSkills} />
              </div>
              <p className="mt-1.5 text-xs" style={{ color: "color-mix(in srgb, var(--foreground) 50%, transparent)" }}>
                Controls how many relevant skills are added to each agent request.
              </p>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-xs" style={{ color: "color-mix(in srgb, var(--foreground) 50%, transparent)" }}>Max skills per request</span>
                <div className="flex items-center gap-2">
                  <input type="range" min="0" max="12" defaultValue="3" className="w-24" />
                  <span className="text-xs" style={{ color: "var(--foreground)" }}>3</span>
                </div>
              </div>
            </div>
            <div className="rounded-md p-3" style={{ border: "1px solid color-mix(in srgb, var(--border) 60%, transparent)", background: "var(--card)" }}>
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold">Auto-approve skills</span>
                <Toggle on />
              </div>
              <p className="mt-1.5 text-xs" style={{ color: "color-mix(in srgb, var(--foreground) 50%, transparent)" }}>
                Audit all publishes passing, necessary skills at or above minimum confidence.
              </p>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-xs" style={{ color: "color-mix(in srgb, var(--foreground) 50%, transparent)" }}>Minimum confidence</span>
                <div className="flex items-center gap-2">
                  <input type="range" min="50" max="100" step="5" defaultValue="85" className="w-24" />
                  <span className="text-xs" style={{ color: "var(--brand)" }}>&ge; 85%</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- Tasks ---------- */

function TasksPanel() {
  const tabs = [
    { k: "tasks", label: "Tasks", count: 2, icon: <CheckSquare className="h-3.5 w-3.5" /> },
    { k: "activity", label: "Activity", icon: <Activity className="h-3.5 w-3.5" /> },
    { k: "add", label: "Add", icon: <Plus className="h-3.5 w-3.5" /> },
  ];
  const [tab, setTab] = useState("tasks");
  const filters = ["all (2)", "documents (1)", "memory (1)"];
  const tasks = [
    { name: "Document Indexer", cron: "0 3 * * *" },
    { name: "Memory Tidy", cron: "0 4 * * *" },
  ];
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-5 px-4 pt-2" style={{ borderBottom: "1px solid color-mix(in srgb, var(--border) 60%, transparent)" }}>
        {tabs.map((t) => (
          <button key={t.k} onClick={() => setTab(t.k)} className="relative pb-2 text-sm transition-colors"
            style={{ color: tab === t.k ? "var(--brand)" : "color-mix(in srgb, var(--foreground) 50%, transparent)" }}>
            <span className="flex items-center gap-1">{t.icon}{t.label}{t.count !== undefined && <span className="text-[10px]" style={{ color: "color-mix(in srgb, var(--foreground) 38%, transparent)" }}>{t.count}</span>}</span>
            {tab === t.k && <span className="absolute -bottom-px left-0 right-0 h-px" style={{ background: "var(--brand)" }} />}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-thin p-4">
        {tab === "tasks" && (
          <>
            <div className="mb-2 flex items-start justify-between">
              <div>
                <div className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>Ongoing Tasks <span className="ml-1 text-xs" style={{ color: "color-mix(in srgb, var(--foreground) 38%, transparent)" }}>2 tasks</span></div>
                <p className="mt-1 text-xs" style={{ color: "color-mix(in srgb, var(--foreground) 50%, transparent)" }}>Scheduled prompts and actions that run automatically. Results appear in a dedicated session.</p>
              </div>
              <button className="flex items-center gap-1 rounded-md px-2 py-1 text-xs transition-colors hover:opacity-80"
                style={{ border: "1px solid color-mix(in srgb, var(--border) 70%, transparent)", color: "color-mix(in srgb, var(--foreground) 50%, transparent)" }}>
                <Pause className="h-3 w-3" /> Pause all
              </button>
            </div>
            <div className="mb-3 mt-3 flex items-center gap-2 text-xs">
              <select className="rounded-md px-2 py-1 outline-none" style={{ border: "1px solid color-mix(in srgb, var(--border) 70%, transparent)", background: "var(--input)", color: "var(--foreground)" }}><option>Recent</option></select>
              <button className="rounded-md px-2 py-1 transition-colors hover:opacity-80" style={{ border: "1px solid color-mix(in srgb, var(--border) 70%, transparent)", color: "color-mix(in srgb, var(--foreground) 50%, transparent)" }}>Select</button>
            </div>
            <div className="mb-3 flex items-center gap-2 rounded-md px-2 py-1.5 text-xs" style={{ border: "1px solid color-mix(in srgb, var(--border) 70%, transparent)", background: "var(--input)" }}>
              <Search className="h-3.5 w-3.5" style={{ color: "color-mix(in srgb, var(--foreground) 50%, transparent)" }} />
              <input placeholder="Search tasks…" className="flex-1 bg-transparent outline-none" style={{ color: "var(--foreground)" }} />
            </div>
            <div className="mb-3 flex flex-wrap gap-1.5 text-[11px]">
              {filters.map((f, i) => <Chip key={f} active={i === 0}>{f}</Chip>)}
            </div>
            <div className="space-y-2">
              {tasks.map((t) => (
                <div key={t.name} className="flex items-center justify-between rounded-md px-3 py-2"
                  style={{ border: "1px solid color-mix(in srgb, var(--border) 60%, transparent)", background: "color-mix(in srgb, var(--card) 40%, transparent)" }}>
                  <div>
                    <div className="flex items-center gap-1.5 text-sm">
                      <span>{t.name}</span>
                      <span className="rounded px-1.5 py-0.5 text-[10px]" style={{ background: "color-mix(in srgb, var(--foreground) 8%, transparent)", color: "color-mix(in srgb, var(--foreground) 50%, transparent)" }}>BUILT-IN</span>
                    </div>
                    <div className="mt-0.5 text-[11px]" style={{ color: "color-mix(in srgb, var(--foreground) 50%, transparent)" }}>Cron: {t.cron}</div>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px]">
                    <span className="flex items-center gap-1 rounded px-2 py-1" style={{ background: "color-mix(in srgb, var(--foreground) 8%, transparent)", color: "color-mix(in srgb, var(--foreground) 50%, transparent)" }}><Pause className="h-3 w-3" /> PAUSED</span>
                    <span className="flex items-center gap-1 rounded px-2 py-1" style={{ border: "1px solid color-mix(in srgb, var(--border) 70%, transparent)", color: "color-mix(in srgb, var(--foreground) 50%, transparent)" }}><Play className="h-3 w-3" /> RUN</span>
                    <button className="hover:opacity-80" style={{ color: "color-mix(in srgb, var(--foreground) 50%, transparent)" }}><MoreVertical className="h-4 w-4" /></button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
        {tab === "activity" && (
          <div className="space-y-2">
            <div className="mb-2 text-sm font-semibold" style={{ color: "var(--foreground)" }}>Recent Activity</div>
            <div className="flex items-center gap-3 rounded-md px-3 py-2" style={{ border: "1px solid color-mix(in srgb, var(--border) 60%, transparent)", background: "color-mix(in srgb, var(--card) 40%, transparent)" }}>
              <CheckSquare className="h-4 w-4" style={{ color: "var(--brand)" }} />
              <div className="flex-1">
                <div className="text-xs">Memory Tidy completed</div>
                <div className="text-[10px]" style={{ color: "color-mix(in srgb, var(--foreground) 38%, transparent)" }}>2 minutes ago</div>
              </div>
            </div>

          </div>
        )}
        {tab === "add" && (
          <div>
            <div className="mb-2 text-sm font-semibold" style={{ color: "var(--foreground)" }}>New Task</div>
            <p className="mb-3 text-xs" style={{ color: "color-mix(in srgb, var(--foreground) 50%, transparent)" }}>
              Create a cron-scheduled prompt that runs automatically.
            </p>
            <div className="space-y-2">
              <input placeholder="Task name" className="w-full rounded-md px-2 py-1.5 text-xs outline-none"
                style={{ border: "1px solid color-mix(in srgb, var(--border) 70%, transparent)", background: "var(--input)", color: "var(--foreground)" }} />
              <textarea placeholder="Prompt template for the AI to execute" rows={3} className="w-full rounded-md px-2 py-1.5 text-xs outline-none resize-y"
                style={{ border: "1px solid color-mix(in srgb, var(--border) 70%, transparent)", background: "var(--input)", color: "var(--foreground)" }} />
              <input placeholder="Cron expression (e.g. 0 */2 * * *)" className="w-full rounded-md px-2 py-1.5 text-xs outline-none"
                style={{ border: "1px solid color-mix(in srgb, var(--border) 70%, transparent)", background: "var(--input)", color: "var(--foreground)" }} />
              <div className="flex justify-end">
                <button className="rounded-md px-3 py-1.5 text-xs text-white" style={{ background: "var(--brand)" }}>Create Task</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function LibraryPanel() {
  const collections = ["All Documents", "Research"];
  const [activeCollection, setActiveCollection] = useState("All Documents");

  const researchPapers = [
    { query: "Trace Odysseus's ten-year journey home from Troy", category: "standard", sources: 14, elapsed: "3m 42s", date: "2 hours ago", id: "research-001" },
    { query: "Compare modern LLM architectures — transformer vs state-space models", category: "comparison", sources: 22, elapsed: "5m 10s", date: "1 day ago", id: "research-002" },
    { query: "How to deploy vLLM with multi-LoRA serving", category: "howto", sources: 8, elapsed: "2m 30s", date: "3 days ago", id: "research-003" },
    { query: "Fact-check: was the Trojan War a real historical event?", category: "factcheck", sources: 11, elapsed: "4m 05s", date: "1 week ago", id: "research-004" },
  ];

  const documents = [
    { name: "api_docs.md", type: "markdown", size: "12 KB", date: "2 days ago" },
    { name: "architecture_overview.txt", type: "text", size: "8 KB", date: "5 days ago" },
    { name: "meeting_notes.pdf", type: "pdf", size: "245 KB", date: "1 week ago" },
    { name: "schema.sql", type: "sql", size: "4 KB", date: "2 weeks ago" },
    { name: "sunset_photo.png", type: "image", size: "1.8 MB", date: "3 days ago" },
    { name: "beach_screenshot.webp", type: "image", size: "640 KB", date: "1 week ago" },
  ];

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-5 px-4 pt-2" style={{ borderBottom: "1px solid color-mix(in srgb, var(--border) 60%, transparent)" }}>
        {collections.map((c) => (
          <button key={c} onClick={() => setActiveCollection(c)} className="relative pb-2 text-sm transition-colors"
            style={{ color: activeCollection === c ? "var(--brand)" : "color-mix(in srgb, var(--foreground) 50%, transparent)" }}>
            <span className="text-xs">{c}</span>
            {activeCollection === c && <span className="absolute -bottom-px left-0 right-0 h-px" style={{ background: "var(--brand)" }} />}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-thin p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs flex-1" style={{ border: "1px solid color-mix(in srgb, var(--border) 70%, transparent)", background: "var(--input)" }}>
            <Search className="h-3.5 w-3.5" style={{ color: "color-mix(in srgb, var(--foreground) 50%, transparent)" }} />
            <input placeholder="Search library…" className="flex-1 bg-transparent outline-none" style={{ color: "var(--foreground)" }} />
          </div>
          <button className="ml-2 flex items-center gap-1 rounded-md px-2 py-1.5 text-xs transition-colors"
            style={{ border: "1px solid color-mix(in srgb, var(--border) 70%, transparent)", color: "color-mix(in srgb, var(--foreground) 50%, transparent)" }}>
            <Plus className="h-3 w-3" /> New
          </button>
        </div>

        {activeCollection === "All Documents" && (
          <div className="space-y-1">
            {documents.map((doc) => (
              <div key={doc.name} className="flex items-center justify-between rounded-md px-3 py-2 cursor-pointer transition-colors hover:bg-[color-mix(in_srgb,var(--foreground)_4%,transparent)]"
                style={{ borderBottom: "1px solid color-mix(in srgb, var(--border) 30%, transparent)" }}>
                <div className="flex items-center gap-2 min-w-0">
                  <BookOpen className="h-4 w-4 shrink-0" style={{ color: doc.type === "image" ? "var(--success)" : "var(--brand)" }} />
                  <div className="min-w-0">
                    <div className="text-sm truncate">{doc.name}</div>
                    <div className="flex items-center gap-2 text-[10px]" style={{ color: "color-mix(in srgb, var(--foreground) 38%, transparent)" }}>
                      <span>{doc.type}</span>
                      <span>{doc.size}</span>
                      <span>{doc.date}</span>
                    </div>
                  </div>
                </div>
                <button className="shrink-0 rounded p-1 transition-colors hover:bg-[color-mix(in_srgb,var(--foreground)_8%,transparent)]" style={{ color: "color-mix(in srgb, var(--foreground) 38%, transparent)" }}>
                  <MoreVertical className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {activeCollection === "Research" && (
          <div className="space-y-2">
            {researchPapers.map((paper) => (
              <div key={paper.id}
                className="cursor-pointer rounded-md px-3 py-2.5 transition-all hover:bg-[color-mix(in_srgb,var(--foreground)_4%,transparent)]"
                style={{ border: "1px solid color-mix(in srgb, var(--border) 60%, transparent)", background: "color-mix(in srgb, var(--card) 40%, transparent)" }}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm leading-snug">{paper.query}</div>
                    <div className="mt-1.5 flex items-center gap-2 text-[10px]" style={{ color: "color-mix(in srgb, var(--foreground) 38%, transparent)" }}>
                      <span className="rounded px-1.5 py-0.5" style={{
                        background: paper.category === "standard" ? "color-mix(in srgb, var(--primary) 8%, transparent)" : "color-mix(in srgb, var(--brand) 15%, transparent)",
                        color: paper.category === "standard" ? "color-mix(in srgb, var(--foreground) 50%, transparent)" : "var(--brand)",
                      }}>{paper.category}</span>
                      <span>{paper.elapsed}</span>
                      <span>{paper.sources} sources</span>
                      <span className="ml-auto">{paper.date}</span>
                    </div>
                  </div>
                  <Globe className="h-4 w-4 shrink-0 mt-0.5" style={{ color: "var(--brand)" }} />
                </div>
                <div className="mt-2 flex items-center gap-1.5 text-[10px]">
                  <button className="rounded px-2 py-1 transition-colors" style={{ border: "1px solid color-mix(in srgb, var(--border) 70%, transparent)", color: "color-mix(in srgb, var(--foreground) 50%, transparent)" }}>
                    <Download className="h-3 w-3 inline mr-1" />Copy
                  </button>
                  <button className="rounded px-2 py-1 transition-colors" style={{ border: "1px solid color-mix(in srgb, var(--border) 70%, transparent)", color: "color-mix(in srgb, var(--foreground) 50%, transparent)" }}>
                    Discuss
                  </button>
                  <button className="ml-auto rounded px-2 py-1 transition-colors" style={{ color: "color-mix(in srgb, var(--foreground) 30%, transparent)" }}>
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ThemePanel() {
  const t = useTheme();
  const [themeTab, setThemeTab] = useState<"browse" | "customize">("browse");
  const [newThemeName, setNewThemeName] = useState("");
  const [importError, setImportError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const colorFields: { key: keyof ThemeColors; label: string }[] = [
    { key: "background", label: "Background" },
    { key: "foreground", label: "Text" },
    { key: "panel", label: "Panel" },
    { key: "card", label: "Card" },
    { key: "border", label: "Border" },
    { key: "brand", label: "Brand" },
    { key: "accent", label: "Accent" },
    { key: "primary", label: "Primary" },
  ];

  const handleExport = () => {
    const json = t.exportTheme();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${t.themeName.replace(/\s+/g, "-").toLowerCase()}-theme.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => fileRef.current?.click();
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    f.text().then((txt) => {
      const res = t.importTheme(txt);
      setImportError(res.ok ? null : res.error ?? "Import failed");
      if (e.target) e.target.value = "";
    });
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-5 px-4 pt-2" style={{ borderBottom: "1px solid color-mix(in srgb, var(--border) 60%, transparent)" }}>
        <button onClick={() => setThemeTab("browse")} className="relative pb-2 text-sm transition-colors"
          style={{ color: themeTab === "browse" ? "var(--brand)" : "color-mix(in srgb, var(--foreground) 50%, transparent)" }}>
          <span className="flex items-center gap-1"><Palette className="h-3.5 w-3.5" />Themes</span>
          {themeTab === "browse" && <span className="absolute -bottom-px left-0 right-0 h-px" style={{ background: "var(--brand)" }} />}
        </button>
        <button onClick={() => setThemeTab("customize")} className="relative pb-2 text-sm transition-colors"
          style={{ color: themeTab === "customize" ? "var(--brand)" : "color-mix(in srgb, var(--foreground) 50%, transparent)" }}>
          <span className="flex items-center gap-1"><Sliders className="h-3.5 w-3.5" />Customize</span>
          {themeTab === "customize" && <span className="absolute -bottom-px left-0 right-0 h-px" style={{ background: "var(--brand)" }} />}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin p-4">
        {themeTab === "browse" && (
          <>
            <div className="mb-2 text-sm font-semibold" style={{ color: "var(--foreground)" }}>Themes</div>
            <div className="mb-4 grid grid-cols-3 gap-2">
              {t.allThemes.map((preset) => {
                const swatch = preset[t.mode];
                const active = t.themeName === preset.name;
                return (
                  <button key={preset.name} onClick={() => t.setThemeName(preset.name)}
                    className="rounded-md px-3 py-2 text-xs text-left transition-all"
                    style={{
                      border: active ? "2px solid var(--brand)" : "1px solid color-mix(in srgb, var(--border) 60%, transparent)",
                      background: active ? "color-mix(in srgb, var(--brand) 8%, transparent)" : "var(--card)",
                      color: "var(--foreground)",
                    }}>
                    <span className="flex items-center gap-1.5">
                      <span className="flex gap-0.5">
                        <span className="h-3 w-3 rounded-sm" style={{ background: swatch.background }} />
                        <span className="h-3 w-3 rounded-sm" style={{ background: swatch.foreground }} />
                        <span className="h-3 w-3 rounded-sm" style={{ background: swatch.brand }} />
                      </span>
                      {preset.name}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mb-3 rounded-md p-3" style={{ border: "1px solid color-mix(in srgb, var(--border) 60%, transparent)", background: "var(--card)" }}>
              <div className="mb-2 text-sm font-semibold" style={{ color: "var(--foreground)" }}>Font & Layout</div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-xs mb-1" style={{ color: "color-mix(in srgb, var(--foreground) 50%, transparent)" }}>Font</label>
                  <select value={t.font} onChange={(e) => t.setFont(e.target.value as typeof t.font)}
                    className="w-full rounded-md px-2 py-1 text-xs outline-none"
                    style={{ border: "1px solid color-mix(in srgb, var(--border) 70%, transparent)", background: "var(--input)", color: "var(--foreground)" }}>
                    <option>Monospace</option><option>Sans-serif</option><option>Serif</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-xs mb-1" style={{ color: "color-mix(in srgb, var(--foreground) 50%, transparent)" }}>Density</label>
                  <select value={t.density} onChange={(e) => t.setDensity(e.target.value as typeof t.density)}
                    className="w-full rounded-md px-2 py-1 text-xs outline-none"
                    style={{ border: "1px solid color-mix(in srgb, var(--border) 70%, transparent)", background: "var(--input)", color: "var(--foreground)" }}>
                    <option>Compact</option><option>Comfortable</option><option>Spacious</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-xs mb-1" style={{ color: "color-mix(in srgb, var(--foreground) 50%, transparent)" }}>Mode</label>
                  <div className="flex gap-1">
                    <button onClick={() => t.setMode("light")} className="flex-1 rounded-md px-2 py-1 text-xs"
                      style={{
                        background: t.mode === "light" ? "color-mix(in srgb, var(--brand) 12%, transparent)" : "var(--input)",
                        color: t.mode === "light" ? "var(--brand)" : "color-mix(in srgb, var(--foreground) 50%, transparent)",
                      }}><Sun className="h-3 w-3 inline mr-1" />Light</button>
                    <button onClick={() => t.setMode("dark")} className="flex-1 rounded-md px-2 py-1 text-xs"
                      style={{
                        background: t.mode === "dark" ? "color-mix(in srgb, var(--brand) 12%, transparent)" : "var(--input)",
                        color: t.mode === "dark" ? "var(--brand)" : "color-mix(in srgb, var(--foreground) 50%, transparent)",
                      }}><Moon className="h-3 w-3 inline mr-1" />Dark</button>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-md p-3" style={{ border: "1px solid color-mix(in srgb, var(--border) 60%, transparent)", background: "var(--card)" }}>
              <div className="mb-2 text-sm font-semibold" style={{ color: "var(--foreground)" }}>Background Effect</div>
              <select value={t.bgEffect} onChange={(e) => t.setBgEffect(e.target.value as typeof t.bgEffect)}
                className="w-full rounded-md px-2 py-1 text-xs outline-none"
                style={{ border: "1px solid color-mix(in srgb, var(--border) 70%, transparent)", background: "var(--input)", color: "var(--foreground)" }}>
                <option>Solid</option><option>Dots</option><option>Synapse</option><option>Rain</option><option>Constellations</option>
              </select>
              <div className="mt-2 flex items-center gap-4">
                <div className="flex-1">
                  <label className="block text-xs mb-1" style={{ color: "color-mix(in srgb, var(--foreground) 50%, transparent)" }}>Intensity</label>
                  <input type="range" min={0} max={100} value={t.bgIntensity}
                    onChange={(e) => t.setBgIntensity(Number(e.target.value))} className="w-full" />
                </div>
                <div className="flex-1">
                  <label className="block text-xs mb-1" style={{ color: "color-mix(in srgb, var(--foreground) 50%, transparent)" }}>Size</label>
                  <input type="range" min={30} max={250} value={t.bgSize}
                    onChange={(e) => t.setBgSize(Number(e.target.value))} className="w-full" />
                </div>
              </div>
            </div>
          </>
        )}

        {themeTab === "customize" && (
          <div className="space-y-3">
            <div className="rounded-md p-3" style={{ border: "1px solid color-mix(in srgb, var(--border) 60%, transparent)", background: "var(--card)" }}>
              <div className="mb-2 text-sm font-semibold" style={{ color: "var(--foreground)" }}>Colors</div>
              <div className="space-y-2">
                {colorFields.map((f) => {
                  const value = t.activeColors[f.key];
                  return (
                    <div key={f.key} className="flex items-center justify-between">
                      <span className="text-xs">{f.label}</span>
                      <div className="flex items-center gap-2">
                        <input type="color" value={value}
                          onChange={(e) => t.setCustomColor(f.key, e.target.value)}
                          className="h-6 w-6 cursor-pointer rounded border-0 bg-transparent p-0"
                          style={{ borderColor: "var(--border)" }} />
                        <input type="text" value={value}
                          onChange={(e) => t.setCustomColor(f.key, e.target.value)}
                          className="w-20 rounded px-1 py-0.5 text-[10px] outline-none"
                          style={{
                            background: "var(--input)", color: "var(--foreground)",
                            border: "1px solid color-mix(in srgb, var(--border) 60%, transparent)",
                            fontFamily: "monospace",
                          }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-md p-3" style={{ border: "1px solid color-mix(in srgb, var(--border) 60%, transparent)", background: "var(--card)" }}>
              <div className="mb-2 text-sm font-semibold" style={{ color: "var(--foreground)" }}>Save / Share</div>
              <div className="flex gap-2">
                <input value={newThemeName} onChange={(e) => setNewThemeName(e.target.value)}
                  placeholder="Theme name..." className="flex-1 rounded-md px-2 py-1.5 text-xs outline-none"
                  style={{ border: "1px solid color-mix(in srgb, var(--border) 70%, transparent)", background: "var(--input)", color: "var(--foreground)" }} />
                <button onClick={() => { if (newThemeName.trim()) { t.saveCustomTheme(newThemeName); setNewThemeName(""); } }}
                  className="rounded-md px-3 py-1.5 text-xs text-white" style={{ background: "var(--brand)" }}>Save</button>
              </div>
              <div className="mt-2 flex gap-2">
                <button onClick={handleImportClick} className="flex items-center gap-1 rounded-md px-2 py-1 text-[10px] transition-colors"
                  style={{ border: "1px solid color-mix(in srgb, var(--border) 70%, transparent)", color: "color-mix(in srgb, var(--foreground) 70%, transparent)" }}>
                  <Upload className="h-3 w-3" /> Import
                </button>
                <button onClick={handleExport} className="flex items-center gap-1 rounded-md px-2 py-1 text-[10px] transition-colors"
                  style={{ border: "1px solid color-mix(in srgb, var(--border) 70%, transparent)", color: "color-mix(in srgb, var(--foreground) 70%, transparent)" }}>
                  <Download className="h-3 w-3" /> Export
                </button>
                <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={handleImportFile} />
              </div>
              {importError && (
                <div className="mt-2 text-[10px]" style={{ color: "var(--destructive, #ff4444)" }}>{importError}</div>
              )}
            </div>

            <button onClick={t.reset} className="w-full rounded-md px-3 py-2 text-xs transition-colors"
              style={{ border: "1px solid color-mix(in srgb, var(--border) 70%, transparent)", color: "color-mix(in srgb, var(--foreground) 70%, transparent)" }}>
              Reset to Default
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- Settings ---------- */

function SettingsPanel() {
  const tabs = [
    { k: "ai", label: "AI Defaults", icon: <BrainIcon className="h-3.5 w-3.5" /> },
    { k: "services", label: "Add Models", icon: <Plus className="h-3.5 w-3.5" /> },
    { k: "appearance", label: "Appearance", icon: <Sliders className="h-3.5 w-3.5" /> },
    { k: "account", label: "Account", icon: <SettingsIcon className="h-3.5 w-3.5" /> },
    { k: "shortcuts", label: "Shortcuts", icon: <Terminal className="h-3.5 w-3.5" /> },
  ];
  const [tab, setTab] = useState("ai");

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-4 pt-2 pb-1" style={{ borderBottom: "1px solid color-mix(in srgb, var(--border) 60%, transparent)" }}>
        <span className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
          {tab === "ai" && "Configure default AI models and agent behavior."}
          {tab === "services" && "Add and manage local endpoints and API providers."}
          {tab === "appearance" && "Toggle on/off visibility of tools and modules across the interface."}
          {tab === "account" && "Manage your profile and security settings."}
          {tab === "shortcuts" && "View and customize keyboard shortcuts."}
        </span>
      </div>
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar tabs */}
        <div className="flex w-36 shrink-0 flex-col gap-0.5 border-r p-2" style={{ borderColor: "color-mix(in srgb, var(--border) 60%, transparent)" }}>
          {tabs.map((t) => (
            <button key={t.k} onClick={() => setTab(t.k)}
              className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs text-left transition-colors"
              style={{
                color: tab === t.k ? "var(--brand)" : "color-mix(in srgb, var(--foreground) 50%, transparent)",
                background: tab === t.k ? "color-mix(in srgb, var(--brand) 8%, transparent)" : "transparent",
              }}>
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>
        {/* Panels */}
        <div className="flex-1 overflow-y-auto scrollbar-thin p-3 text-xs space-y-3">

          {tab === "ai" && (
            <>
              <div className="rounded-md p-3" style={{ border: "1px solid color-mix(in srgb, var(--border) 60%, transparent)", background: "var(--card)" }}>
                <div className="mb-1.5 text-sm font-semibold">Default Chat Model</div>
                <div className="space-y-2">
                  <div>
                    <span className="block mb-0.5" style={{ color: "color-mix(in srgb, var(--foreground) 50%, transparent)" }}>Endpoint</span>
                    <select className="w-full rounded-md px-2 py-1 outline-none" style={{ border: "1px solid color-mix(in srgb, var(--border) 70%, transparent)", background: "var(--input)", color: "var(--foreground)" }}>
                      <option>Ollama (Connected)</option>
                    </select>
                  </div>
                  <div>
                    <span className="block mb-0.5" style={{ color: "color-mix(in srgb, var(--foreground) 50%, transparent)" }}>Model</span>
                    <select className="w-full rounded-md px-2 py-1 outline-none" style={{ border: "1px solid color-mix(in srgb, var(--border) 70%, transparent)", background: "var(--input)", color: "var(--foreground)" }}>
                      <option>gemma4:latest</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="rounded-md p-3" style={{ border: "1px solid color-mix(in srgb, var(--border) 60%, transparent)", background: "var(--card)" }}>
                <div className="mb-1.5 text-sm font-semibold">Utility Model</div>
                <select className="w-full rounded-md px-2 py-1 outline-none" style={{ border: "1px solid color-mix(in srgb, var(--border) 70%, transparent)", background: "var(--input)", color: "var(--foreground)" }}>
                  <option>gemma4:latest</option>
                </select>
              </div>
              <div className="rounded-md p-3" style={{ border: "1px solid color-mix(in srgb, var(--border) 60%, transparent)", background: "var(--card)" }}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">Agent Tool Call Limit</span>
                  <input type="number" defaultValue={10} min={1} max={50} className="w-16 rounded-md px-2 py-1 text-right outline-none"
                    style={{ border: "1px solid color-mix(in srgb, var(--border) 70%, transparent)", background: "var(--input)", color: "var(--foreground)" }} />
                </div>
              </div>
              <div className="rounded-md p-3" style={{ border: "1px solid color-mix(in srgb, var(--border) 60%, transparent)", background: "var(--card)" }}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold">Vision</div>
                    <p className="mt-0.5" style={{ color: "color-mix(in srgb, var(--foreground) 50%, transparent)" }}>Enable vision capabilities</p>
                  </div>
                  <Toggle on />
                </div>
              </div>
            </>
          )}

          {tab === "services" && (
            <>
              <div className="rounded-md p-3" style={{ border: "1px solid color-mix(in srgb, var(--border) 60%, transparent)", background: "var(--card)" }}>
                <div className="mb-2 text-sm font-semibold">Local Endpoints</div>
                <div className="mb-2 flex gap-2">
                  <input placeholder="http://localhost:11434" className="flex-1 rounded-md px-2 py-1.5 outline-none"
                    style={{ border: "1px solid color-mix(in srgb, var(--border) 70%, transparent)", background: "var(--input)", color: "var(--foreground)" }} />
                  <button className="rounded-md px-3 py-1.5 text-xs text-white" style={{ background: "var(--brand)" }}>Add</button>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between rounded-md px-2 py-1.5" style={{ background: "color-mix(in srgb, var(--foreground) 4%, transparent)" }}>
                    <span>Ollama</span>
                    <span className="text-xs" style={{ color: "var(--success)" }}>Connected</span>
                  </div>
                  <div className="flex items-center justify-between rounded-md px-2 py-1.5" style={{ background: "color-mix(in srgb, var(--foreground) 4%, transparent)" }}>
                    <span>LM Studio</span>
                    <span className="text-xs" style={{ color: "color-mix(in srgb, var(--foreground) 38%, transparent)" }}>Not configured</span>
                  </div>
                  <div className="flex items-center justify-between rounded-md px-2 py-1.5" style={{ background: "color-mix(in srgb, var(--foreground) 4%, transparent)" }}>
                    <span>vLLM</span>
                    <span className="text-xs" style={{ color: "color-mix(in srgb, var(--foreground) 38%, transparent)" }}>Not configured</span>
                  </div>
                </div>
              </div>
              <div className="rounded-md p-3" style={{ border: "1px solid color-mix(in srgb, var(--border) 60%, transparent)", background: "var(--card)" }}>
                <div className="mb-2 text-sm font-semibold">API Providers</div>
                <div className="flex h-20 items-center justify-center rounded-md border border-dashed" style={{ borderColor: "color-mix(in srgb, var(--border) 70%, transparent)" }}>
                  <span style={{ color: "color-mix(in srgb, var(--foreground) 30%, transparent)" }}>No API providers configured</span>
                </div>
              </div>
            </>
          )}

          {tab === "appearance" && (
            <>
              <div className="rounded-md p-3" style={{ border: "1px solid color-mix(in srgb, var(--border) 60%, transparent)", background: "var(--card)" }}>
                <div className="mb-2 text-sm font-semibold">Sidebar Elements</div>
                <div className="space-y-1.5">
                  {["Brand", "Search", "New Chat", "Chats", "Models", "Brain", "Deep Research", "Library", "Tasks", "Theme"].map((item) => (
                    <div key={item} className="flex items-center justify-between">
                      <span>{item}</span>
                      <Toggle on />
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-md p-3" style={{ border: "1px solid color-mix(in srgb, var(--border) 60%, transparent)", background: "var(--card)" }}>
                <div className="mb-2 text-sm font-semibold">Chat Area</div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span>Auto-scroll</span>
                    <Toggle on />
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Nobody Mode</span>
                    <Toggle />
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Sound Effects</span>
                    <Toggle />
                  </div>
                </div>
              </div>
            </>
          )}

          {tab === "account" && (
            <>
              <div className="rounded-md p-3" style={{ border: "1px solid color-mix(in srgb, var(--border) 60%, transparent)", background: "var(--card)" }}>
                <div className="mb-2 text-sm font-semibold">Profile</div>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold uppercase"
                    style={{ background: "color-mix(in srgb, var(--brand) 20%, transparent)", color: "var(--brand)" }}>A</div>
                  <div>
                    <div className="text-sm">admin</div>
                    <div className="text-xs" style={{ color: "color-mix(in srgb, var(--foreground) 50%, transparent)" }}>admin@odysseus.local</div>
                  </div>
                </div>
              </div>
              <div className="rounded-md p-3" style={{ border: "1px solid color-mix(in srgb, var(--border) 60%, transparent)", background: "var(--card)" }}>
                <div className="mb-2 text-sm font-semibold">Change Password</div>
                <div className="space-y-2">
                  <input type="password" placeholder="Current password" className="w-full rounded-md px-2 py-1.5 text-xs outline-none"
                    style={{ border: "1px solid color-mix(in srgb, var(--border) 70%, transparent)", background: "var(--input)", color: "var(--foreground)" }} />
                  <input type="password" placeholder="New password" className="w-full rounded-md px-2 py-1.5 text-xs outline-none"
                    style={{ border: "1px solid color-mix(in srgb, var(--border) 70%, transparent)", background: "var(--input)", color: "var(--foreground)" }} />
                  <div className="flex justify-end">
                    <button className="rounded-md px-3 py-1.5 text-xs text-white" style={{ background: "var(--brand)" }}>Update</button>
                  </div>
                </div>
              </div>
            </>
          )}

          {tab === "shortcuts" && (
            <div className="rounded-md p-3" style={{ border: "1px solid color-mix(in srgb, var(--border) 60%, transparent)", background: "var(--card)" }}>
              <div className="mb-2 text-sm font-semibold">Keyboard Shortcuts</div>
              <div className="space-y-1.5">
                {[
                  { action: "Search conversations", key: "Ctrl+K" },
                  { action: "Toggle sidebar", key: "Ctrl+B" },
                  { action: "New chat", key: "Ctrl+Shift+N" },
                  { action: "Toggle Nobody mode", key: "Ctrl+Shift+I" },
                ].map((s) => (
                  <div key={s.action} className="flex items-center justify-between rounded-md px-2 py-1.5"
                    style={{ background: "color-mix(in srgb, var(--foreground) 4%, transparent)" }}>
                    <span>{s.action}</span>
                    <kbd className="rounded px-1.5 py-0.5 text-[10px]" style={{ background: "var(--input)", border: "1px solid color-mix(in srgb, var(--border) 70%, transparent)", fontFamily: "inherit" }}>{s.key}</kbd>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

/* ---------- Deep Research ---------- */

function DeepResearchPanel() {
  return (
    <div className="h-full overflow-y-auto scrollbar-thin p-4 space-y-3">
      <div className="mb-2">
        <div className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>Deep Research</div>
        <p className="mt-1 text-xs" style={{ color: "color-mix(in srgb, var(--foreground) 50%, transparent)" }}>
          Autonomous research agent that searches, reads, and synthesizes information from multiple sources.
        </p>
      </div>

      <div className="flex items-center gap-2 rounded-md px-3 py-2" style={{ border: "1px solid color-mix(in srgb, var(--border) 70%, transparent)", background: "var(--input)" }}>
        <Search className="h-4 w-4" style={{ color: "color-mix(in srgb, var(--foreground) 50%, transparent)" }} />
        <input placeholder="What would you like to research?" className="flex-1 bg-transparent text-sm outline-none" style={{ color: "var(--foreground)" }} />
        <button className="rounded-md px-3 py-1 text-xs text-white" style={{ background: "var(--brand)" }}>Research</button>
      </div>

      <div className="rounded-md p-3" style={{ border: "1px solid color-mix(in srgb, var(--border) 60%, transparent)", background: "var(--card)" }}>
        <div className="text-xs font-semibold mb-2" style={{ color: "var(--foreground)" }}>Sources</div>
        <div className="space-y-1.5">
          {["Web Search", "Wikipedia", "ArXiv", "News", "GitHub"].map((s) => (
            <label key={s} className="flex items-center gap-2 text-xs cursor-pointer">
              <input type="checkbox" defaultChecked={s === "Web Search" || s === "Wikipedia"} className="accent-[var(--brand)]" />
              {s}
            </label>
          ))}
        </div>
      </div>

      <div className="rounded-md p-3" style={{ border: "1px solid color-mix(in srgb, var(--border) 60%, transparent)", background: "var(--card)" }}>
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold">Depth</span>
          <span className="text-xs" style={{ color: "var(--brand)" }}>3 pages deep</span>
        </div>
        <input type="range" min="1" max="10" defaultValue="3" className="w-full mt-1" />
      </div>

      <div className="rounded-md p-3" style={{ border: "1px solid color-mix(in srgb, var(--border) 60%, transparent)", background: "var(--card)" }}>
        <div className="text-xs font-semibold mb-2" style={{ color: "var(--foreground)" }}>Recent Research</div>
        <div className="flex h-24 items-center justify-center rounded-md border border-dashed" style={{ borderColor: "color-mix(in srgb, var(--border) 70%, transparent)" }}>
          <p className="text-xs" style={{ color: "color-mix(in srgb, var(--foreground) 30%, transparent)" }}>No recent research sessions</p>
        </div>
      </div>
    </div>
  );
}

/* ---------- Search ---------- */

/* ---------- Search ---------- */

interface SearchPanelProps {
  chats: Chat[];
  onSelectChat: (id: string) => void;
  memories: { id: string; text: string; tags: string[]; meta: string }[];
  files: { id: string; name: string; type: string; size: string; date: string }[];
}

function SearchPanel({ chats, onSelectChat, memories, files }: SearchPanelProps) {
  const [query, setQuery] = useState("");
  const [selectedTab, setSelectedTab] = useState<"All" | "Chats" | "Memories" | "Files">("All");

  // Filter lists
  const filteredChats = chats.filter(chat => 
    chat.title.toLowerCase().includes(query.toLowerCase()) ||
    chat.preview.toLowerCase().includes(query.toLowerCase()) ||
    chat.messages.some(m => m.text.toLowerCase().includes(query.toLowerCase()))
  );

  const filteredMemories = memories.filter(mem => 
    mem.text.toLowerCase().includes(query.toLowerCase()) ||
    mem.tags.some(t => t.toLowerCase().includes(query.toLowerCase()))
  );

  const filteredFiles = files.filter(f => 
    f.name.toLowerCase().includes(query.toLowerCase()) ||
    f.type.toLowerCase().includes(query.toLowerCase())
  );

  // Group all results
  const showChats = selectedTab === "All" || selectedTab === "Chats";
  const showMemories = selectedTab === "All" || selectedTab === "Memories";
  const showFiles = selectedTab === "All" || selectedTab === "Files";

  const totalResults = 
    (showChats ? filteredChats.length : 0) +
    (showMemories ? filteredMemories.length : 0) +
    (showFiles ? filteredFiles.length : 0);

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 pb-2">
        <div className="flex items-center gap-2 rounded-md px-3 py-2" style={{ border: "1px solid color-mix(in srgb, var(--border) 70%, transparent)", background: "var(--input)" }}>
          <Search className="h-4 w-4" style={{ color: "color-mix(in srgb, var(--foreground) 50%, transparent)" }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search conversations, files, memories…"
            className="flex-1 bg-transparent text-sm outline-none"
            style={{ color: "var(--foreground)" }}
            autoFocus
          />
          {query && (
            <button onClick={() => setQuery("")} className="opacity-50 hover:opacity-100 text-xs">
              Clear
            </button>
          )}
        </div>
        <div className="mt-2 flex gap-1.5 text-[11px]">
          {(["All", "Chats", "Memories", "Files"] as const).map((tab) => (
            <Chip
              key={tab}
              active={selectedTab === tab}
              onClick={() => setSelectedTab(tab)}
            >
              {tab}
            </Chip>
          ))}
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto scrollbar-thin px-4 pb-4 space-y-4">
        {query === "" ? (
          <div>
            <div className="mb-2 text-xs font-semibold" style={{ color: "color-mix(in srgb, var(--foreground) 50%, transparent)" }}>Recent Conversations</div>
            <div className="space-y-1">
              {chats.slice(0, 3).map((chat) => (
                <div
                  key={chat.id}
                  onClick={() => onSelectChat(chat.id)}
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs cursor-pointer transition-colors hover:bg-[color-mix(in_srgb,var(--foreground)_4%,transparent)]"
                  style={{ color: "var(--foreground)" }}
                >
                  <Clock className="h-3 w-3" style={{ color: "color-mix(in srgb, var(--foreground) 30%, transparent)" }} />
                  <span className="truncate flex-1">{chat.title}</span>
                  <span className="text-[10px] opacity-40">{chat.date}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="text-[10px] font-semibold tracking-wider uppercase opacity-40">
              Search Results ({totalResults})
            </div>

            {/* Chats results */}
            {showChats && filteredChats.length > 0 && (
              <div>
                <div className="text-[10px] font-semibold text-brand mb-1">Chats</div>
                <div className="space-y-1">
                  {filteredChats.map(chat => (
                    <div
                      key={chat.id}
                      onClick={() => onSelectChat(chat.id)}
                      className="group flex flex-col gap-0.5 rounded-md px-2 py-1.5 text-xs cursor-pointer transition-colors hover:bg-[color-mix(in_srgb,var(--foreground)_4%,transparent)]"
                      style={{ color: "var(--foreground)", border: "1px solid color-mix(in srgb, var(--border) 20%, transparent)" }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold group-hover:text-brand transition-colors">{chat.title}</span>
                        <span className="text-[9px] opacity-40">{chat.date}</span>
                      </div>
                      <span className="text-[10px] opacity-60 truncate">{chat.preview}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Memories results */}
            {showMemories && filteredMemories.length > 0 && (
              <div>
                <div className="text-[10px] font-semibold text-brand mb-1">Memories</div>
                <div className="space-y-1">
                  {filteredMemories.map(mem => (
                    <div
                      key={mem.id}
                      className="flex flex-col gap-0.5 rounded-md px-2 py-1.5 text-xs cursor-default"
                      style={{ color: "var(--foreground)", border: "1px solid color-mix(in srgb, var(--border) 20%, transparent)" }}
                    >
                      <span className="opacity-90">{mem.text}</span>
                      <div className="flex gap-1 mt-1">
                        {mem.tags.map(t => (
                          <span key={t} className="px-1 py-0.5 rounded text-[8px]" style={{ background: "color-mix(in srgb, var(--brand) 15%, transparent)", color: "var(--brand)" }}>
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Files results */}
            {showFiles && filteredFiles.length > 0 && (
              <div>
                <div className="text-[10px] font-semibold text-brand mb-1">Files</div>
                <div className="space-y-1">
                  {filteredFiles.map(f => (
                    <div
                      key={f.id}
                      className="flex items-center justify-between rounded-md px-2 py-1.5 text-xs cursor-default"
                      style={{ color: "var(--foreground)", border: "1px solid color-mix(in srgb, var(--border) 20%, transparent)" }}
                    >
                      <div className="flex items-center gap-1.5">
                        <FileText className="h-3 w-3" style={{ color: "var(--brand)" }} />
                        <span>{f.name}</span>
                      </div>
                      <span className="text-[9px] opacity-40">{f.size}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {totalResults === 0 && (
              <div className="text-center py-6 text-xs opacity-50">
                No matching results found for "{query}"
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}


