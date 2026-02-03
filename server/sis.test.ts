import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock the database functions
vi.mock("./db", () => ({
  createSisEntry: vi.fn().mockResolvedValue(1),
  updateSisEntry: vi.fn().mockResolvedValue(undefined),
  getSisEntry: vi.fn().mockResolvedValue({
    id: 1,
    userId: 1,
    patientName: "Max Mustermann",
    birthDate: "1945-03-15",
    conversationDate: "2026-02-03",
    nurseSignature: "MM",
    relativeOrCaregiver: "Erika Mustermann",
    oTon: "Ich möchte so selbstständig wie möglich bleiben.",
    themenfeld1: "Orientiert zu Person und Ort, leichte Wortfindungsstörungen",
    themenfeld2: "Geht mit Rollator, Sturzgefahr bei Transfers",
    themenfeld3: "Diabetes mellitus Typ 2, Hypertonie",
    themenfeld4: "Benötigt Unterstützung bei der Körperpflege",
    themenfeld5: "Regelmäßiger Kontakt zur Tochter",
    themenfeld6: "Bewohnt Einzelzimmer, barrierefrei",
    riskMatrix: {
      dekubitus: { tf1: { ja: false, weitere: false }, tf2: { ja: true, weitere: true } },
      sturz: { tf2: { ja: true, weitere: true } },
    },
    massnahmenplan: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }),
  listSisEntries: vi.fn().mockResolvedValue([
    {
      id: 1,
      userId: 1,
      patientName: "Max Mustermann",
      conversationDate: "2026-02-03",
      oTon: "Ich möchte so selbstständig wie möglich bleiben.",
      massnahmenplan: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]),
  deleteSisEntry: vi.fn().mockResolvedValue(undefined),
  getSetting: vi.fn().mockResolvedValue("sk-test-key-12345"),
  setSetting: vi.fn().mockResolvedValue(undefined),
}));

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user-123",
    email: "test@example.com",
    name: "Test User",
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

describe("sis.create", () => {
  it("creates a new SIS entry with valid data", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.sis.create({
      patientName: "Max Mustermann",
      birthDate: "1945-03-15",
      conversationDate: "2026-02-03",
      nurseSignature: "MM",
      relativeOrCaregiver: "Erika Mustermann",
      oTon: "Ich möchte so selbstständig wie möglich bleiben.",
      themenfeld1: "Orientiert zu Person und Ort",
      themenfeld2: "Geht mit Rollator",
      themenfeld3: "Diabetes mellitus Typ 2",
      themenfeld4: "Benötigt Unterstützung bei der Körperpflege",
      themenfeld5: "Regelmäßiger Kontakt zur Tochter",
      themenfeld6: "Bewohnt Einzelzimmer",
      riskMatrix: {
        dekubitus: { tf1: { ja: false, weitere: false } },
        sturz: { tf2: { ja: true, weitere: true } },
      },
    });

    expect(result).toEqual({ id: 1 });
  });

  it("requires patient name", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.sis.create({
        patientName: "",
      })
    ).rejects.toThrow();
  });
});

describe("sis.list", () => {
  it("returns list of SIS entries for authenticated user", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.sis.list();

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toHaveProperty("patientName");
  });
});

describe("sis.get", () => {
  it("returns a single SIS entry by id", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.sis.get({ id: 1 });

    expect(result).toBeDefined();
    expect(result?.patientName).toBe("Max Mustermann");
    expect(result?.oTon).toBe("Ich möchte so selbstständig wie möglich bleiben.");
  });
});

describe("sis.update", () => {
  it("updates an existing SIS entry", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.sis.update({
      id: 1,
      data: {
        oTon: "Aktualisierter O-Ton",
        themenfeld1: "Aktualisierte Einschätzung",
      },
    });

    expect(result).toEqual({ success: true });
  });
});

describe("sis.delete", () => {
  it("deletes a SIS entry", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.sis.delete({ id: 1 });

    expect(result).toEqual({ success: true });
  });
});

describe("settings.getApiKey", () => {
  it("returns masked API key", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.settings.getApiKey();

    expect(result).toBeDefined();
    expect(result).toContain("...");
    expect(result?.startsWith("sk-test")).toBe(true);
  });
});

describe("settings.setApiKey", () => {
  it("saves API key successfully", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.settings.setApiKey({
      apiKey: "sk-new-test-key-67890",
    });

    expect(result).toEqual({ success: true });
  });
});
