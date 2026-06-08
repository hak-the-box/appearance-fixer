import type { ChatMessage, ModelEndpoint, StreamEvent } from "./types";

/** Server-only LLM call engine. Streams normalized SSE events. */

const CONNECT_TIMEOUT_MS = 3_000;
const READ_TIMEOUT_MS = 300_000;

// ─── OpenAI-compatible (covers Ollama, vLLM, LM Studio, etc.) ─────────

async function* streamOpenAICompatible(
  endpoint: ModelEndpoint,
  messages: ChatMessage[],
  model: string,
  opts?: { temperature?: number; max_tokens?: number },
): AsyncGenerator<StreamEvent> {
  const url = `${endpoint.baseUrl}/v1/chat/completions`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (endpoint.apiKey) {
    headers["Authorization"] = `Bearer ${endpoint.apiKey}`;
  }

  const body = JSON.stringify({
    model,
    messages,
    stream: true,
    temperature: opts?.temperature ?? 0.7,
    max_tokens: opts?.max_tokens ?? 4096,
  });

  const res = await fetch(url, {
    method: "POST",
    headers,
    body,
    signal: AbortSignal.timeout(CONNECT_TIMEOUT_MS + READ_TIMEOUT_MS),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    yield { type: "error", message: `Upstream ${res.status}: ${text.slice(0, 200)}` };
    return;
  }

  const reader = res.body?.getReader();
  if (!reader) {
    yield { type: "error", message: "No response body" };
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
      if (!trimmed || trimmed === ":") continue;
      if (trimmed === "data: [DONE]") {
        yield { type: "done" };
        return;
      }
      if (!trimmed.startsWith("data: ")) continue;

      try {
        const json = JSON.parse(trimmed.slice(6));
        const delta = json.choices?.[0]?.delta;
        if (delta?.content) {
          yield { type: "delta", text: delta.content };
        }
        if (json.usage) {
          yield {
            type: "usage",
            input_tokens: json.usage.prompt_tokens ?? 0,
            output_tokens: json.usage.completion_tokens ?? 0,
          };
        }
      } catch {
        // skip malformed chunks
      }
    }
  }
  yield { type: "done" };
}

// ─── Anthropic ─────────────────────────────────────────────────────────

async function* streamAnthropic(
  endpoint: ModelEndpoint,
  messages: ChatMessage[],
  model: string,
  opts?: { temperature?: number; max_tokens?: number },
): AsyncGenerator<StreamEvent> {
  const url = `${endpoint.baseUrl}/v1/messages`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-api-key": endpoint.apiKey ?? "",
    "anthropic-version": "2023-06-01",
  };

  // Anthropic requires system messages to be separate
  const systemParts: string[] = [];
  const chatMessages: { role: "user" | "assistant"; content: string }[] = [];
  for (const m of messages) {
    if (m.role === "system") {
      systemParts.push(m.content);
    } else {
      chatMessages.push({ role: m.role, content: m.content });
    }
  }

  const body = JSON.stringify({
    model,
    messages: chatMessages,
    system: systemParts.length ? systemParts.join("\n\n") : undefined,
    stream: true,
    temperature: opts?.temperature ?? 0.7,
    max_tokens: opts?.max_tokens ?? 4096,
  });

  const res = await fetch(url, {
    method: "POST",
    headers,
    body,
    signal: AbortSignal.timeout(CONNECT_TIMEOUT_MS + READ_TIMEOUT_MS),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    yield { type: "error", message: `Anthropic ${res.status}: ${text.slice(0, 200)}` };
    return;
  }

  const reader = res.body?.getReader();
  if (!reader) {
    yield { type: "error", message: "No response body" };
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
      if (!trimmed || trimmed === ":") continue;
      if (!trimmed.startsWith("data: ")) continue;

      try {
        const json = JSON.parse(trimmed.slice(6));
        if (json.type === "content_block_delta" && json.delta?.text) {
          yield { type: "delta", text: json.delta.text };
        }
        if (json.type === "message_delta" && json.usage) {
          yield {
            type: "usage",
            input_tokens: json.usage.input_tokens ?? 0,
            output_tokens: json.usage.output_tokens ?? 0,
          };
        }
        if (json.type === "message_stop") {
          yield { type: "done" };
          return;
        }
      } catch {
        // skip malformed chunks
      }
    }
  }
  yield { type: "done" };
}

// ─── Unified stream entry point ────────────────────────────────────────

export async function* streamLlm(
  endpoint: ModelEndpoint,
  messages: ChatMessage[],
  model: string,
  opts?: { temperature?: number; max_tokens?: number },
): AsyncGenerator<StreamEvent> {
  switch (endpoint.provider) {
    case "anthropic":
      yield* streamAnthropic(endpoint, messages, model, opts);
      break;
    default:
      // ollama, openai, openai-compatible all use the OpenAI chat completions API
      yield* streamOpenAICompatible(endpoint, messages, model, opts);
      break;
  }
}

// ─── Non-streaming convenience wrapper ─────────────────────────────────

export async function chatCompletion(
  endpoint: ModelEndpoint,
  messages: ChatMessage[],
  model: string,
  opts?: { temperature?: number; max_tokens?: number },
): Promise<string> {
  let text = "";
  for await (const event of streamLlm(endpoint, messages, model, opts)) {
    if (event.type === "delta") text += event.text;
    if (event.type === "error") throw new Error(event.message);
  }
  return text;
}
