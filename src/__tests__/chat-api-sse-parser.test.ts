import { describe, it, expect } from "vitest";

/**
 * Test the SSE parser logic extracted from chat-api.ts.
 * Since parseSseEvent is not exported, we test the same logic inline.
 */

function parseSseEvent(rawEvent: string) {
  const lines = rawEvent.split("\n");
  let event = "message";
  const dataLines: string[] = [];

  for (const line of lines) {
    if (line.startsWith("event:")) {
      event = line.slice(6).trim();
      continue;
    }
    if (line.startsWith("data:")) {
      dataLines.push(line.slice(5).trimStart());
    }
  }

  return { event, data: dataLines.join("\n") };
}

describe("SSE parser", () => {
  it("parses delta event", () => {
    const raw = 'event: delta\ndata: {"text":"hello"}';
    const result = parseSseEvent(raw);
    expect(result.event).toBe("delta");
    expect(JSON.parse(result.data)).toEqual({ text: "hello" });
  });

  it("parses tool event", () => {
    const raw = 'event: tool\ndata: {"toolName":"getPreviousDeployments","status":"running"}';
    const result = parseSseEvent(raw);
    expect(result.event).toBe("tool");
    expect(JSON.parse(result.data).toolName).toBe("getPreviousDeployments");
  });

  it("parses result event with full response", () => {
    const payload = {
      requestId: "req-1",
      message: { role: "assistant", text: "test" },
      surface: null,
      awaiting: null,
      pendingTool: null,
      decision: { mode: "text" },
    };
    const raw = `event: result\ndata: ${JSON.stringify(payload)}`;
    const result = parseSseEvent(raw);
    expect(result.event).toBe("result");
    expect(JSON.parse(result.data).requestId).toBe("req-1");
  });

  it("parses error event", () => {
    const raw = 'event: error\ndata: {"message":"something went wrong"}';
    const result = parseSseEvent(raw);
    expect(result.event).toBe("error");
    expect(JSON.parse(result.data).message).toBe("something went wrong");
  });

  it("parses done event with empty data", () => {
    const raw = "event: done\ndata: {}";
    const result = parseSseEvent(raw);
    expect(result.event).toBe("done");
  });

  it("handles multi-line data", () => {
    const raw = "event: delta\ndata: line1\ndata: line2";
    const result = parseSseEvent(raw);
    expect(result.data).toBe("line1\nline2");
  });

  it("defaults to 'message' event when no event line", () => {
    const raw = 'data: {"text":"hi"}';
    const result = parseSseEvent(raw);
    expect(result.event).toBe("message");
  });

  it("handles malformed JSON gracefully in data", () => {
    const raw = "event: delta\ndata: not-json";
    const result = parseSseEvent(raw);
    expect(result.event).toBe("delta");
    expect(() => JSON.parse(result.data)).toThrow();
  });
});
