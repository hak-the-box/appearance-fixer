import type { DiscoveredHost, StreamEvent } from "./llm/types";

export interface ChatResponse {
  reply: string;
}

/**
 * Sends a chat message to the backend and returns the assistant reply.
 * Falls back to mock when no LLM is reachable.
 */
export async function sendChatMessage(
  message: string,
  options?: { model?: string; endpointId?: string; baseUrl?: string },
): Promise<string> {
  const base = options?.baseUrl ?? "";
  const res = await fetch(`${base}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      model: options?.model,
      endpointId: options?.endpointId,
    }),
  });

  if (!res.ok) {
    throw new Error(`Chat request failed: ${res.status}`);
  }

  const data = (await res.json()) as ChatResponse;
  return data.reply;
}

/**
 * Sends a chat message and streams the response via SSE.
 * Calls `onDelta` for each text chunk, `onDone` when complete,
 * `onError` on failure.
 */
export async function sendChatStream(
  message: string,
  options?: {
    model?: string;
    endpointId?: string;
    baseUrl?: string;
    onDelta: (text: string) => void;
    onDone?: () => void;
    onError?: (error: string) => void;
  },
): Promise<void> {
  const base = options?.baseUrl ?? "";
  const res = await fetch(`${base}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      stream: true,
      model: options?.model,
      endpointId: options?.endpointId,
    }),
  });

  if (!res.ok) {
    const msg = `Chat request failed: ${res.status}`;
    options?.onError?.(msg);
    return;
  }

  const reader = res.body?.getReader();
  if (!reader) {
    options?.onError?.("No response body");
    return;
  }

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      if (trimmed === "data: [DONE]") {
        options?.onDone?.();
        return;
      }
      if (!trimmed.startsWith("data: ")) continue;

      try {
        const event: StreamEvent = JSON.parse(trimmed.slice(6));
        if (event.type === "delta") options?.onDelta(event.text);
        if (event.type === "error") options?.onError?.(event.message);
        if (event.type === "done") {
          options?.onDone?.();
          return;
        }
      } catch {
        // skip malformed
      }
    }
  }
  options?.onDone?.();
}

/** Fetch discovered models from the backend. */
export async function fetchModels(baseUrl = ""): Promise<DiscoveredHost[]> {
  try {
    const res = await fetch(`${baseUrl}/api/models`);
    if (!res.ok) return [];
    const data = (await res.json()) as { hosts: DiscoveredHost[] };
    return data.hosts ?? [];
  } catch {
    return [];
  }
}
