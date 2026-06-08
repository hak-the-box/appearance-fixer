import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { sendChatMessage, sendChatStream, fetchModels } from "../src/lib/chat";
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
    const reply = await sendChatMessage("Hello there", { baseUrl: server.url });
    expect(reply).toContain("Hello there");
    expect(reply).toMatch(/simulating a response/);
  });

  it("works for multiple sequential messages", async () => {
    const a = await sendChatMessage("first", { baseUrl: server.url });
    const b = await sendChatMessage("second", { baseUrl: server.url });
    expect(a).toContain("first");
    expect(b).toContain("second");
    expect(a).not.toEqual(b);
  });

  it("throws on empty message (400 from server)", async () => {
    await expect(sendChatMessage("", { baseUrl: server.url })).rejects.toThrow(/failed: 400/);
  });
});

describe("sendChatStream against mock server", () => {
  it("streams deltas and calls onDone", async () => {
    const chunks: string[] = [];
    let done = false;
    await sendChatStream("Stream test", {
      baseUrl: server.url,
      onDelta: (text) => chunks.push(text),
      onDone: () => { done = true; },
    });
    expect(done).toBe(true);
    const full = chunks.join("");
    expect(full).toContain("Stream test");
    expect(full).toMatch(/simulating a response/);
  });

  it("calls onError on empty message", async () => {
    let errorMsg = "";
    await sendChatStream("", {
      baseUrl: server.url,
      onDelta: () => {},
      onError: (msg) => { errorMsg = msg; },
    });
    expect(errorMsg).toMatch(/failed: 400/);
  });
});

describe("fetchModels", () => {
  it("returns empty hosts from mock server", async () => {
    const hosts = await fetchModels(server.url);
    expect(hosts).toEqual([]);
  });
});
