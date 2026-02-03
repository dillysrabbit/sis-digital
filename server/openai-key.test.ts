import { describe, expect, it } from "vitest";

describe("OpenAI API Key Validation", () => {
  it("validates that OPENAI_API_KEY is set and has correct format", async () => {
    const apiKey = process.env.OPENAI_API_KEY;
    
    // Check that the key exists
    expect(apiKey).toBeDefined();
    expect(apiKey).not.toBe("");
    
    // Check that the key has the correct format (starts with sk-)
    expect(apiKey?.startsWith("sk-")).toBe(true);
  });

  it("can make a lightweight API call to OpenAI", async () => {
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is not set");
    }

    // Make a lightweight models list call to validate the key
    const response = await fetch("https://api.openai.com/v1/models", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
      },
    });

    // The key should be valid and return 200
    expect(response.status).toBe(200);
    
    const data = await response.json();
    expect(data).toHaveProperty("data");
    expect(Array.isArray(data.data)).toBe(true);
  });
});
