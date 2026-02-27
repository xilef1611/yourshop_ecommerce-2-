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
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as TrpcContext["res"],
  };
}

function createUserContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 2,
    openId: "regular-user",
    email: "user@example.com",
    name: "Regular User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as TrpcContext["res"],
  };
}

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as TrpcContext["res"],
  };
}

// ==================== MARKETING TESTS ====================
describe("marketing admin access", () => {
  it("blocks non-admin from listing campaigns", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(caller.marketing.campaigns.list()).rejects.toThrow();
  });

  it("blocks unauthenticated from listing campaigns", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(caller.marketing.campaigns.list()).rejects.toThrow();
  });

  it("blocks non-admin from segment preview", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(caller.marketing.segmentPreview({ segment: "all" })).rejects.toThrow();
  });

  it("blocks non-admin from creating campaigns", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(
      caller.marketing.campaigns.create({
        name: "Test",
        subject: "Test Subject",
        body: "Test Body",
        segment: "all",
      })
    ).rejects.toThrow();
  });

  it("blocks non-admin from sending campaigns", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(caller.marketing.campaigns.send({ id: 1 })).rejects.toThrow();
  });

  it("blocks non-admin from deleting campaigns", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(caller.marketing.campaigns.delete({ id: 1 })).rejects.toThrow();
  });

  it("allows admin to access segment preview", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.marketing.segmentPreview({ segment: "all" });
    expect(result).toHaveProperty("count");
    expect(result).toHaveProperty("customers");
    expect(typeof result.count).toBe("number");
    expect(Array.isArray(result.customers)).toBe(true);
  });

  it("allows admin to list campaigns", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.marketing.campaigns.list();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("marketing campaign creation validation", () => {
  it("rejects campaign with empty name", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    await expect(
      caller.marketing.campaigns.create({
        name: "",
        subject: "Test",
        body: "Test",
        segment: "all",
      })
    ).rejects.toThrow();
  });

  it("rejects campaign with empty subject", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    await expect(
      caller.marketing.campaigns.create({
        name: "Test",
        subject: "",
        body: "Test",
        segment: "all",
      })
    ).rejects.toThrow();
  });

  it("rejects campaign with empty body", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    await expect(
      caller.marketing.campaigns.create({
        name: "Test",
        subject: "Test",
        body: "",
        segment: "all",
      })
    ).rejects.toThrow();
  });
});

describe("marketing segment types", () => {
  it("handles all segment type", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.marketing.segmentPreview({ segment: "all" });
    expect(result).toHaveProperty("count");
  });

  it("handles repeat segment type", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.marketing.segmentPreview({ segment: "repeat" });
    expect(result).toHaveProperty("count");
  });

  it("handles new segment type", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.marketing.segmentPreview({ segment: "new" });
    expect(result).toHaveProperty("count");
  });

  it("handles high_value segment type", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.marketing.segmentPreview({ segment: "high_value", segmentValue: "100" });
    expect(result).toHaveProperty("count");
  });

  it("handles category segment type", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.marketing.segmentPreview({ segment: "category", segmentValue: "Electronics" });
    expect(result).toHaveProperty("count");
  });

  it("handles registered segment type", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.marketing.segmentPreview({ segment: "registered" });
    expect(result).toHaveProperty("count");
  });

  it("handles unknown segment type gracefully", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.marketing.segmentPreview({ segment: "nonexistent" });
    expect(result.count).toBe(0);
  });
});

// ==================== SHIPPING TESTS ====================
describe("shipping options access", () => {
  it("allows public access to active shipping options", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.shipping.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("blocks non-admin from listing all shipping options", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(caller.shipping.listAll()).rejects.toThrow();
  });

  it("allows admin to list all shipping options", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.shipping.listAll();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("shipping options CRUD access control", () => {
  it("blocks non-admin from creating shipping options", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(
      caller.shipping.create({
        name: "Standard",
        price: "5.99",
      })
    ).rejects.toThrow();
  });

  it("blocks unauthenticated from creating shipping options", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.shipping.create({
        name: "Standard",
        price: "5.99",
      })
    ).rejects.toThrow();
  });

  it("blocks non-admin from updating shipping options", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(
      caller.shipping.update({ id: 1, name: "Updated" })
    ).rejects.toThrow();
  });

  it("blocks non-admin from deleting shipping options", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(caller.shipping.delete({ id: 1 })).rejects.toThrow();
  });
});

describe("shipping options creation validation", () => {
  it("rejects shipping option with empty name", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    await expect(
      caller.shipping.create({
        name: "",
        price: "5.99",
      })
    ).rejects.toThrow();
  });
});
