import process from "node:process";
import type { ModelEndpoint, ProviderKind } from "./types";

/** Server-only LLM configuration. Reads env vars per-request for Cloudflare compat. */

export function getLlmConfig() {
  const ollamaUrl = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
  const openaiKey = process.env.OPENAI_API_KEY || "";
  const anthropicKey = process.env.ANTHROPIC_API_KEY || "";

  const endpoints: ModelEndpoint[] = [];

  // Ollama (always included, health-checked at runtime)
  endpoints.push({
    id: "ollama-default",
    baseUrl: ollamaUrl,
    provider: "ollama",
    label: "Ollama",
  });

  // OpenAI
  if (openaiKey) {
    endpoints.push({
      id: "openai-default",
      baseUrl: "https://api.openai.com",
      apiKey: openaiKey,
      provider: "openai",
      label: "OpenAI",
    });
  }

  // Anthropic
  if (anthropicKey) {
    endpoints.push({
      id: "anthropic-default",
      baseUrl: "https://api.anthropic.com",
      apiKey: anthropicKey,
      provider: "anthropic",
      label: "Anthropic",
    });
  }

  // Extra hosts from LLM_HOSTS (comma-separated URLs)
  const extraHosts = process.env.LLM_HOSTS || "";
  if (extraHosts) {
    for (const raw of extraHosts.split(",")) {
      const url = raw.trim();
      if (!url) continue;
      endpoints.push({
        id: `custom-${url.replace(/[^a-z0-9]/gi, "-")}`,
        baseUrl: url,
        provider: "openai-compatible",
        label: new URL(url).host,
      });
    }
  }

  return { endpoints, ollamaUrl, openaiKey, anthropicKey };
}

/** Detect provider kind from a URL. */
export function detectProvider(url: string): ProviderKind {
  const host = new URL(url).hostname;
  if (host.includes("anthropic.com")) return "anthropic";
  if (host.includes("openai.com")) return "openai";
  if (host === "localhost" || host === "127.0.0.1" || host === "host.docker.internal") {
    // Default local to ollama if port 11434, otherwise openai-compatible
    const port = new URL(url).port;
    if (port === "11434") return "ollama";
  }
  return "openai-compatible";
}
