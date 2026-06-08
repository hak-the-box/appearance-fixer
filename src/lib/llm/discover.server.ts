import type { DiscoveredHost } from "./types";
import { getLlmConfig } from "./config.server";

const TIMEOUT_MS = 2_000;

/** Probe a single OpenAI-compatible endpoint for its model list. */
async function probeModels(baseUrl: string): Promise<string[]> {
  try {
    const url = `${baseUrl}/v1/models`;
    const res = await fetch(url, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return [];
    const json = await res.json();
    const data = json?.data;
    if (!Array.isArray(data)) return [];
    return data
      .map((m: Record<string, unknown>) => (typeof m.id === "string" ? m.id : ""))
      .filter(Boolean)
      .sort();
  } catch {
    return [];
  }
}

/** Discover all reachable models across configured endpoints. */
export async function discoverModels(): Promise<DiscoveredHost[]> {
  const { endpoints } = getLlmConfig();
  const results: DiscoveredHost[] = [];

  const probes = endpoints.map(async (ep) => {
    const models = await probeModels(ep.baseUrl);
    if (models.length > 0) {
      results.push({
        url: ep.baseUrl,
        provider: ep.provider,
        models,
      });
    }
  });

  await Promise.allSettled(probes);
  return results;
}
