import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "admin-user",
    email: "admin@example.com",
    name: "Admin User",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("SIS Check Admin Settings", () => {
  it("admin can get check system prompt", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const prompt = await caller.admin.getCheckSystemPrompt();
    
    expect(prompt).toBeDefined();
    expect(typeof prompt).toBe("string");
    expect(prompt.length).toBeGreaterThan(0);
    // Should contain check-related content
    expect(prompt.toLowerCase()).toMatch(/prüf|check|vollständig|plausibil/i);
  });

  it("admin can get check prompt templates", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const templates = await caller.admin.getCheckPromptTemplates();
    
    expect(templates).toBeDefined();
    expect(Array.isArray(templates)).toBe(true);
    expect(templates.length).toBeGreaterThan(0);
    
    // Check that each template has required fields
    templates.forEach(template => {
      expect(template).toHaveProperty("id");
      expect(template).toHaveProperty("name");
      expect(template).toHaveProperty("description");
      expect(template).toHaveProperty("prompt");
    });
  });

  it("admin can get check selected model", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const model = await caller.admin.getCheckSelectedModel();
    
    expect(model).toBeDefined();
    expect(typeof model).toBe("string");
    // Should be a valid model ID
    expect(["claude-sonnet-4-6", "claude-opus-4-6", "claude-haiku-4-5-20251001"]).toContain(model);
  });

  it("admin can set check model", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.admin.setCheckModel({ model: "claude-opus-4-6" });
    
    expect(result).toEqual({ success: true });
  });

  it("admin can set check system prompt", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const testPrompt = "Test-Prüfungsprompt für die SIS-Qualitätsprüfung";
    const result = await caller.admin.setCheckSystemPrompt({ prompt: testPrompt });
    
    expect(result).toEqual({ success: true });
  });

  it("admin can reset check system prompt", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.admin.resetCheckSystemPrompt();
    
    expect(result).toHaveProperty("success", true);
    expect(result).toHaveProperty("prompt");
    expect(typeof result.prompt).toBe("string");
  });

  it("admin can apply check template", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    // First get templates to find a valid ID
    const templates = await caller.admin.getCheckPromptTemplates();
    const firstTemplate = templates[0];

    const result = await caller.admin.applyCheckTemplate({ templateId: firstTemplate.id });
    
    expect(result).toHaveProperty("success", true);
    expect(result).toHaveProperty("prompt");
    expect(result.prompt).toBe(firstTemplate.prompt);
  });
});

describe("SIS Check vs Plan Independence", () => {
  it("check and plan prompts are independent", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const planPrompt = await caller.admin.getSystemPrompt();
    const checkPrompt = await caller.admin.getCheckSystemPrompt();
    
    // Both should exist
    expect(planPrompt).toBeDefined();
    expect(checkPrompt).toBeDefined();
    
    // They should be different (different default prompts)
    expect(planPrompt).not.toBe(checkPrompt);
  });

  it("check and plan models can be set independently", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    // Set different models for each
    await caller.admin.setModel({ model: "claude-sonnet-4-6" });
    await caller.admin.setCheckModel({ model: "claude-haiku-4-5-20251001" });

    const planModel = await caller.admin.getSelectedModel();
    const checkModel = await caller.admin.getCheckSelectedModel();

    // They should be different
    expect(planModel).toBe("claude-sonnet-4-6");
    expect(checkModel).toBe("claude-haiku-4-5-20251001");
  });
});
