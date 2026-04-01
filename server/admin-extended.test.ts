import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock the database functions
vi.mock("./db", () => ({
  createSisEntry: vi.fn().mockResolvedValue(1),
  updateSisEntry: vi.fn().mockResolvedValue(undefined),
  getSisEntry: vi.fn().mockResolvedValue(null),
  listSisEntries: vi.fn().mockResolvedValue([]),
  deleteSisEntry: vi.fn().mockResolvedValue(undefined),
  getSetting: vi.fn().mockResolvedValue(null),
  setSetting: vi.fn().mockResolvedValue(undefined),
  getGlobalSetting: vi.fn().mockResolvedValue(null),
  setGlobalSetting: vi.fn().mockResolvedValue(undefined),
}));

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "admin-user-123",
    email: "admin@example.com",
    name: "Admin User",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };

  return { ctx };
}

function createUserContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 2,
    openId: "regular-user-456",
    email: "user@example.com",
    name: "Regular User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };

  return { ctx };
}

describe("admin.getModels", () => {
  it("returns available models for admin users", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.admin.getModels();

    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toHaveProperty("id");
    expect(result[0]).toHaveProperty("name");
    expect(result[0]).toHaveProperty("description");
  });

  it("throws FORBIDDEN error for regular users", async () => {
    const { ctx } = createUserContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.admin.getModels()).rejects.toThrow("Nur Administratoren haben Zugriff");
  });
});

describe("admin.getSelectedModel", () => {
  it("returns default model when none is set", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.admin.getSelectedModel();

    expect(result).toBe("claude-sonnet-4-6");
  });

  it("throws FORBIDDEN error for regular users", async () => {
    const { ctx } = createUserContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.admin.getSelectedModel()).rejects.toThrow("Nur Administratoren haben Zugriff");
  });
});

describe("admin.setModel", () => {
  it("saves valid model for admin users", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.admin.setModel({ model: "claude-opus-4-6" });

    expect(result).toEqual({ success: true });
  });

  it("rejects invalid model", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.admin.setModel({ model: "invalid-model" })
    ).rejects.toThrow("Ungültiges Modell");
  });

  it("throws FORBIDDEN error for regular users", async () => {
    const { ctx } = createUserContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.admin.setModel({ model: "claude-sonnet-4-6" })
    ).rejects.toThrow("Nur Administratoren haben Zugriff");
  });
});

describe("admin.getPromptTemplates", () => {
  it("returns prompt templates for admin users", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.admin.getPromptTemplates();

    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toHaveProperty("id");
    expect(result[0]).toHaveProperty("name");
    expect(result[0]).toHaveProperty("description");
    expect(result[0]).toHaveProperty("prompt");
  });

  it("throws FORBIDDEN error for regular users", async () => {
    const { ctx } = createUserContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.admin.getPromptTemplates()).rejects.toThrow("Nur Administratoren haben Zugriff");
  });
});

describe("admin.applyTemplate", () => {
  it("applies valid template for admin users", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.admin.applyTemplate({ templateId: "kompakt" });

    expect(result).toHaveProperty("success", true);
    expect(result).toHaveProperty("prompt");
    expect(typeof result.prompt).toBe("string");
  });

  it("rejects invalid template ID", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.admin.applyTemplate({ templateId: "invalid-template" })
    ).rejects.toThrow("Vorlage nicht gefunden");
  });

  it("throws FORBIDDEN error for regular users", async () => {
    const { ctx } = createUserContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.admin.applyTemplate({ templateId: "standard" })
    ).rejects.toThrow("Nur Administratoren haben Zugriff");
  });
});
