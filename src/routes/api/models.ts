import { createFileRoute } from "@tanstack/react-router";
import { discoverModels } from "@/lib/llm/discover.server";
import type { DiscoveredHost } from "@/lib/llm/types";

export const Route = createFileRoute("/api/models")({
  server: {
    handlers: {
      GET: async () => {
        const hosts: DiscoveredHost[] = await discoverModels();
        return Response.json({ hosts });
      },
    },
  },
});
