import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const ChatRequestSchema = z.object({
  message: z.string().min(1).max(4000),
});

export function buildReply(message: string): string {
  return `I've received your query: "${message}". Since this is a local-first mockup environment, I'm simulating a response. How can I help you work on the Odysseus codebase or guide your voyage?`;
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
            { status: 400, headers: { "Content-Type": "application/json" } }
          );
        }

        return Response.json({ reply: buildReply(parsed.data.message) });
      },
    },
  },
});
