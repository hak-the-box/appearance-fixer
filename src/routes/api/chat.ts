import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { getLlmConfig } from "@/lib/llm/config.server";
import { streamLlm } from "@/lib/llm/call.server";
import type { ChatMessage, StreamEvent } from "@/lib/llm/types";

const ChatRequestSchema = z.object({
  message: z.string().min(1).max(4000),
  model: z.string().optional(),
  endpointId: z.string().optional(),
  stream: z.boolean().optional(),
});

/** Fallback mock reply when no LLM endpoint is reachable. */
export function buildReply(message: string): string {
  return `I've received your query: "${message}". Since this is a local-first mockup environment, I'm simulating a response. How can I help you work on the Odysseus codebase or guide your voyage?`;
}

/** Convert an async generator of StreamEvents into an SSE Response. */
function sseResponse(events: AsyncGenerator<StreamEvent>): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async pull(controller) {
      try {
        const { value, done } = await events.next();
        if (done) {
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
          return;
        }
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(value)}\n\n`));
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "error", message: msg })}\n\n`),
        );
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return new Response(JSON.stringify({ error: "Invalid JSON" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        const parsed = ChatRequestSchema.safeParse(body);
        if (!parsed.success) {
          return new Response(
            JSON.stringify({ error: "Invalid request", details: parsed.error.issues }),
            { status: 400, headers: { "Content-Type": "application/json" } },
          );
        }

        const { message, model, endpointId, stream: wantStream } = parsed.data;
        const { endpoints } = getLlmConfig();

        // Resolve which endpoint to use
        const endpoint = endpointId
          ? endpoints.find((e) => e.id === endpointId)
          : endpoints[0];

        if (!endpoint) {
          // No endpoints configured — fall back to mock
          if (wantStream) {
            const mockEvents = mockStream(message);
            return sseResponse(mockEvents);
          }
          return Response.json({ reply: buildReply(message) });
        }

        // Verify endpoint is reachable (quick health check for Ollama)
        if (endpoint.provider === "ollama") {
          try {
            const healthRes = await fetch(`${endpoint.baseUrl}/api/tags`, {
              signal: AbortSignal.timeout(3_000),
            });
            if (!healthRes.ok) throw new Error("unhealthy");
          } catch {
            // Ollama unreachable — fall back to mock
            if (wantStream) {
              const mockEvents = mockStream(message);
              return sseResponse(mockEvents);
            }
            return Response.json({ reply: buildReply(message) });
          }
        }

        // Determine model name
        const modelName = model ?? getDefaultModel(endpoint.provider, endpoint.baseUrl);

        const messages: ChatMessage[] = [
          {
            role: "system",
            content:
              "You are Odysseus, a helpful AI assistant running locally. Be concise and accurate.",
          },
          { role: "user", content: message },
        ];

        // Streaming response
        if (wantStream) {
          const events = streamLlm(endpoint, messages, modelName);
          return sseResponse(events);
        }

        // Non-streaming: collect the full reply
        try {
          const reply = await collectReply(streamLlm(endpoint, messages, modelName));
          return Response.json({ reply });
        } catch (err) {
          const msg = err instanceof Error ? err.message : "LLM call failed";
          return new Response(JSON.stringify({ error: msg }), {
            status: 502,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});

/** Collect all deltas from a stream into a single string. */
async function collectReply(events: AsyncGenerator<StreamEvent>): Promise<string> {
  let text = "";
  for await (const event of events) {
    if (event.type === "delta") text += event.text;
    if (event.type === "error") throw new Error(event.message);
  }
  return text;
}

/** Generate a mock streaming response for when no LLM is available. */
async function* mockStream(message: string): AsyncGenerator<StreamEvent> {
  const reply = buildReply(message);
  // Stream word by word for a realistic effect
  const words = reply.split(" ");
  for (let i = 0; i < words.length; i++) {
    yield { type: "delta", text: (i > 0 ? " " : "") + words[i] };
    await new Promise((r) => setTimeout(r, 30));
  }
  yield { type: "done" };
}

/** Pick a reasonable default model for a provider. */
function getDefaultModel(provider: string, baseUrl: string): string {
  if (provider === "ollama") return "llama3.2";
  if (provider === "anthropic") return "claude-sonnet-4-20250514";
  if (provider === "openai") return "gpt-4o-mini";
  // For openai-compatible, try to guess from common patterns
  if (baseUrl.includes("localhost") || baseUrl.includes("127.0.0.1")) return "default";
  return "default";
}
