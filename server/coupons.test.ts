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

// ==================== ACCESS CONTROL ====================
describe("coupons admin access control", () => {
  it("blocks non-admin from listing coupons", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(caller.coupons.list()).rejects.toThrow();
  });

  it("blocks unauthenticated from listing coupons", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(caller.coupons.list()).rejects.toThrow();
  });

  it("blocks non-admin from creating coupons", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(
      caller.coupons.create({
        code: "TEST10",
        discountType: "percentage",
        discountValue: "10",
      })
    ).rejects.toThrow();
  });

  it("blocks unauthenticated from creating coupons", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.coupons.create({
        code: "TEST10",
        discountType: "percentage",
        discountValue: "10",
      })
    ).rejects.toThrow();
  });

  it("blocks non-admin from updating coupons", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(
      caller.coupons.update({ id: 1, code: "UPDATED" })
    ).rejects.toThrow();
  });

  it("blocks non-admin from deleting coupons", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(caller.coupons.delete({ id: 1 })).rejects.toThrow();
  });

  it("blocks non-admin from viewing usages", async () => {
    const caller = appRouter.createCaller(createUserContext());
    await expect(caller.coupons.usages({ couponId: 1 })).rejects.toThrow();
  });

  it("allows admin to list coupons", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.coupons.list();
    expect(Array.isArray(result)).toBe(true);
  });
});

// ==================== PUBLIC VALIDATION ====================
describe("coupons public validation", () => {
  it("allows public to validate a coupon code", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.coupons.validate({ code: "NONEXISTENT", orderTotal: 50 });
    expect(result.valid).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it("allows authenticated user to validate a coupon code", async () => {
    const caller = appRouter.createCaller(createUserContext());
    const result = await caller.coupons.validate({ code: "NONEXISTENT", orderTotal: 50 });
    expect(result.valid).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it("returns proper structure for invalid coupon", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.coupons.validate({ code: "INVALID", orderTotal: 100 });
    expect(result).toHaveProperty("valid");
    expect(result).toHaveProperty("discountAmount");
    expect(result).toHaveProperty("error");
    expect(result.valid).toBe(false);
    expect(result.discountAmount).toBe(0);
  });
});

// ==================== INPUT VALIDATION ====================
describe("coupons input validation", () => {
  it("rejects coupon with empty code", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    await expect(
      caller.coupons.create({
        code: "",
        discountType: "percentage",
        discountValue: "10",
      })
    ).rejects.toThrow();
  });

  it("rejects validation with empty code", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.coupons.validate({ code: "", orderTotal: 50 })
    ).rejects.toThrow();
  });

  it("rejects validation with negative order total", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.coupons.validate({ code: "TEST", orderTotal: -10 })
    ).rejects.toThrow();
  });

  it("rejects invalid discount type", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    await expect(
      caller.coupons.create({
        code: "TEST",
        discountType: "invalid" as any,
        discountValue: "10",
      })
    ).rejects.toThrow();
  });
});

// ==================== COUPON CREATION (ADMIN) ====================
describe("coupons admin CRUD", () => {
  it("allows admin to create percentage coupon", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.coupons.create({
      code: `TEST_PCT_${Date.now()}`,
      discountType: "percentage",
      discountValue: "15",
      description: "Test percentage coupon",
    });
    expect(result).toHaveProperty("id");
    expect(typeof result.id).toBe("number");
  });

  it("allows admin to create fixed coupon with all options", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.coupons.create({
      code: `TEST_FIX_${Date.now()}`,
      discountType: "fixed",
      discountValue: "5.00",
      description: "Test fixed coupon",
      minOrderAmount: "20.00",
      usageLimit: 100,
      perUserLimit: 1,
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
    });
    expect(result).toHaveProperty("id");
  });

  it("allows admin to view coupon usages", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.coupons.usages({ couponId: 999 });
    expect(Array.isArray(result)).toBe(true);
  });
});
