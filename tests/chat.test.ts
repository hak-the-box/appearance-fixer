import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { sendChatMessage } from "../src/lib/chat";
import { startMockServer, type MockServer } from "./mockServer";

let server: MockServer;

beforeAll(async () => {
  server = await startMockServer();
});

afterAll(async () => {
  await server.close();
});

describe("sendChatMessage against mock server", () => {
  it("returns an assistant reply that echoes the user message", async () => {
    const reply = await sendChatMessage("Hello there", server.url);
    expect(reply).toContain("Hello there");
    expect(reply).toMatch(/simulating a response/);
  });

  it("works for multiple sequential messages", async () => {
    const a = await sendChatMessage("first", server.url);
    const b = await sendChatMessage("second", server.url);
    expect(a).toContain("first");
    expect(b).toContain("second");
    expect(a).not.toEqual(b);
  });

  it("throws on empty message (400 from server)", async () => {
    await expect(sendChatMessage("", server.url)).rejects.toThrow(/failed: 400/);
  });
});
