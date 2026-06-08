export interface ChatResponse {
  reply: string;
}

/**
 * Sends a chat message to the backend and returns the assistant reply.
 * The base URL can be overridden at runtime (used by tests against a mock server).
 */
export async function sendChatMessage(
  message: string,
  baseUrl: string = ""
): Promise<string> {
  const res = await fetch(`${baseUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });

  if (!res.ok) {
    throw new Error(`Chat request failed: ${res.status}`);
  }

  const data = (await res.json()) as ChatResponse;
  return data.reply;
}
