import { createServer, type Server } from "node:http";
import { buildReply } from "../src/routes/api/chat";

export interface MockServer {
  url: string;
  close: () => Promise<void>;
}

/**
 * Tiny Node http mock server that mimics the production /api/chat route.
 * Supports both non-streaming and SSE streaming responses.
 */
export async function startMockServer(): Promise<MockServer> {
  const server: Server = createServer((req, res) => {
    if (req.method === "POST" && req.url === "/api/chat") {
      let raw = "";
      req.on("data", (chunk) => (raw += chunk));
      req.on("end", () => {
        try {
          const body = JSON.parse(raw);
          if (typeof body.message !== "string" || body.message.length === 0) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Invalid request" }));
            return;
          }

          if (body.stream) {
            // SSE streaming response
            res.writeHead(200, {
              "Content-Type": "text/event-stream",
              "Cache-Control": "no-cache",
            });
            const reply = buildReply(body.message);
            const words = reply.split(" ");
            let i = 0;
            const interval = setInterval(() => {
              if (i < words.length) {
                const text = (i > 0 ? " " : "") + words[i];
                res.write(`data: ${JSON.stringify({ type: "delta", text })}\n\n`);
                i++;
              } else {
                res.write("data: [DONE]\n\n");
                res.end();
                clearInterval(interval);
              }
            }, 10);
          } else {
            // Non-streaming JSON response
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ reply: buildReply(body.message) }));
          }
        } catch {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Invalid JSON" }));
        }
      });
      return;
    }

    if (req.method === "GET" && req.url === "/api/models") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ hosts: [] }));
      return;
    }

    res.writeHead(404);
    res.end();
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Failed to bind mock server");
  }

  return {
    url: `http://127.0.0.1:${address.port}`,
    close: () =>
      new Promise<void>((resolve, reject) =>
        server.close((err) => (err ? reject(err) : resolve()))
      ),
  };
}
