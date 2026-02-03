import { describe, expect, it, vi, beforeEach } from "vitest";
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

describe("admin.isAdmin", () => {
  it("returns true for admin users", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.admin.isAdmin();

    expect(result).toBe(true);
  });

  it("returns false for regular users", async () => {
    const { ctx } = createUserContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.admin.isAdmin();

    expect(result).toBe(false);
  });
});

describe("admin.getSystemPrompt", () => {
  it("returns system prompt for admin users", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.admin.getSystemPrompt();

    expect(result).toBeDefined();
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  it("throws FORBIDDEN error for regular users", async () => {
    const { ctx } = createUserContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.admin.getSystemPrompt()).rejects.toThrow("Nur Administratoren haben Zugriff");
  });
});

describe("admin.setSystemPrompt", () => {
  it("saves system prompt for admin users", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.admin.setSystemPrompt({
      prompt: "Neuer Systemprompt für Tests",
    });

    expect(result).toEqual({ success: true });
  });

  it("throws FORBIDDEN error for regular users", async () => {
    const { ctx } = createUserContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.admin.setSystemPrompt({ prompt: "Test prompt" })
    ).rejects.toThrow("Nur Administratoren haben Zugriff");
  });

  it("rejects empty prompt", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.admin.setSystemPrompt({ prompt: "" })
    ).rejects.toThrow();
  });
});

describe("admin.resetSystemPrompt", () => {
  it("resets system prompt for admin users", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.admin.resetSystemPrompt();

    expect(result).toHaveProperty("success", true);
    expect(result).toHaveProperty("prompt");
    expect(typeof result.prompt).toBe("string");
  });

  it("throws FORBIDDEN error for regular users", async () => {
    const { ctx } = createUserContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.admin.resetSystemPrompt()).rejects.toThrow("Nur Administratoren haben Zugriff");
  });
});
