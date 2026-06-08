/** LLM provider types shared between client and server. */

export type ProviderKind = "ollama" | "openai" | "anthropic" | "openai-compatible";

export interface ModelEndpoint {
  id: string;
  baseUrl: string;
  apiKey?: string;
  provider: ProviderKind;
  label?: string;
}

export interface DiscoveredModel {
  id: string;
  provider: ProviderKind;
  endpointId: string;
}

export interface DiscoveredHost {
  url: string;
  provider: ProviderKind;
  models: string[];
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatCompletionRequest {
  messages: ChatMessage[];
  model: string;
  stream?: boolean;
  temperature?: number;
  max_tokens?: number;
}

/** Normalized SSE event sent from the server stream. */
export type StreamEvent =
  | { type: "delta"; text: string }
  | { type: "usage"; input_tokens: number; output_tokens: number }
  | { type: "done" }
  | { type: "error"; message: string };
