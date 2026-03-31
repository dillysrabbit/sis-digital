import { describe, expect, it } from "vitest";

describe("Anthropic API Key Validation", () => {
  it("validates that ANTHROPIC_API_KEY is set and has correct format", async () => {
    const apiKey = process.env.ANTHROPIC_API_KEY;

    // Check that the key exists
    expect(apiKey).toBeDefined();
    expect(apiKey).not.toBe("");

    // Check that the key has the correct format (starts with sk-ant-)
    expect(apiKey?.startsWith("sk-ant-")).toBe(true);
  });

  it("can make a lightweight API call to Anthropic", async () => {
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY is not set");
    }

    // Make a lightweight messages call to validate the key
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1,
        messages: [{ role: "user", content: "Hi" }],
      }),
    });

    // The key should be valid and return 200
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty("content");
    expect(Array.isArray(data.content)).toBe(true);
  });
});
