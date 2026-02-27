import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import type { User } from "../drizzle/schema";

// ==================== HELPERS ====================

function createUser(overrides: Partial<User> = {}): User {
  return {
    id: 1,
    openId: "test-user-123",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    phone: null,
    addressStreet: null,
    addressCity: null,
    addressPostal: null,
    addressCountry: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    ...overrides,
  };
}

function createAdminUser(overrides: Partial<User> = {}): User {
  return createUser({ role: "admin", id: 99, openId: "admin-user-123", name: "Admin User", ...overrides });
}

function createContext(user: User | null = null): TrpcContext {
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

// ==================== ACCESS CONTROL TESTS ====================

describe("analytics access control", () => {
  it("denies unauthenticated users from accessing analytics summary", async () => {
    const caller = appRouter.createCaller(createContext(null));
    await expect(caller.analytics.summary()).rejects.toThrow();
  });

  it("denies regular users from accessing analytics summary", async () => {
    const caller = appRouter.createCaller(createContext(createUser()));
    await expect(caller.analytics.summary()).rejects.toThrow();
  });

  it("denies unauthenticated users from accessing revenue time series", async () => {
    const caller = appRouter.createCaller(createContext(null));
    await expect(caller.analytics.revenueTimeSeries({ days: 30 })).rejects.toThrow();
  });

  it("denies regular users from accessing revenue time series", async () => {
    const caller = appRouter.createCaller(createContext(createUser()));
    await expect(caller.analytics.revenueTimeSeries({ days: 30 })).rejects.toThrow();
  });

  it("denies regular users from accessing order status distribution", async () => {
    const caller = appRouter.createCaller(createContext(createUser()));
    await expect(caller.analytics.orderStatusDistribution()).rejects.toThrow();
  });

  it("denies regular users from accessing payment status distribution", async () => {
    const caller = appRouter.createCaller(createContext(createUser()));
    await expect(caller.analytics.paymentStatusDistribution()).rejects.toThrow();
  });

  it("denies regular users from accessing top products", async () => {
    const caller = appRouter.createCaller(createContext(createUser()));
    await expect(caller.analytics.topProducts({ limit: 10 })).rejects.toThrow();
  });

  it("denies regular users from accessing new customers trend", async () => {
    const caller = appRouter.createCaller(createContext(createUser()));
    await expect(caller.analytics.newCustomersTrend({ days: 30 })).rejects.toThrow();
  });

  it("denies regular users from accessing repeat customers stats", async () => {
    const caller = appRouter.createCaller(createContext(createUser()));
    await expect(caller.analytics.repeatCustomers()).rejects.toThrow();
  });

  it("denies regular users from accessing revenue by category", async () => {
    const caller = appRouter.createCaller(createContext(createUser()));
    await expect(caller.analytics.revenueByCategory()).rejects.toThrow();
  });
});

// ==================== ADMIN ACCESS TESTS ====================

describe("analytics admin access", () => {
  it("allows admin to access analytics summary", async () => {
    const caller = appRouter.createCaller(createContext(createAdminUser()));
    const result = await caller.analytics.summary();
    expect(result).toBeDefined();
    expect(typeof result.totalRevenue).toBe("number");
    expect(typeof result.totalOrders).toBe("number");
    expect(typeof result.totalCustomers).toBe("number");
    expect(typeof result.avgOrderValue).toBe("number");
    expect(typeof result.paidOrders).toBe("number");
  });

  it("allows admin to access revenue time series", async () => {
    const caller = appRouter.createCaller(createContext(createAdminUser()));
    const result = await caller.analytics.revenueTimeSeries({ days: 30 });
    expect(Array.isArray(result)).toBe(true);
  });

  it("allows admin to access order status distribution", async () => {
    const caller = appRouter.createCaller(createContext(createAdminUser()));
    const result = await caller.analytics.orderStatusDistribution();
    expect(Array.isArray(result)).toBe(true);
  });

  it("allows admin to access payment status distribution", async () => {
    const caller = appRouter.createCaller(createContext(createAdminUser()));
    const result = await caller.analytics.paymentStatusDistribution();
    expect(Array.isArray(result)).toBe(true);
  });

  it("allows admin to access top products", async () => {
    const caller = appRouter.createCaller(createContext(createAdminUser()));
    const result = await caller.analytics.topProducts({ limit: 5 });
    expect(Array.isArray(result)).toBe(true);
  });

  it("allows admin to access new customers trend", async () => {
    const caller = appRouter.createCaller(createContext(createAdminUser()));
    const result = await caller.analytics.newCustomersTrend({ days: 7 });
    expect(Array.isArray(result)).toBe(true);
  });

  it("allows admin to access repeat customers stats", async () => {
    const caller = appRouter.createCaller(createContext(createAdminUser()));
    const result = await caller.analytics.repeatCustomers();
    expect(result).toBeDefined();
    expect(typeof result.totalCustomers).toBe("number");
    expect(typeof result.repeatCustomers).toBe("number");
    expect(typeof result.repeatRate).toBe("number");
  });

  it("allows admin to access revenue by category", async () => {
    const caller = appRouter.createCaller(createContext(createAdminUser()));
    const result = await caller.analytics.revenueByCategory();
    expect(Array.isArray(result)).toBe(true);
  });
});

// ==================== INPUT VALIDATION TESTS ====================

describe("analytics input validation", () => {
  it("accepts valid days parameter for revenue time series", async () => {
    const caller = appRouter.createCaller(createContext(createAdminUser()));
    const result = await caller.analytics.revenueTimeSeries({ days: 7 });
    expect(Array.isArray(result)).toBe(true);
  });

  it("accepts valid limit parameter for top products", async () => {
    const caller = appRouter.createCaller(createContext(createAdminUser()));
    const result = await caller.analytics.topProducts({ limit: 3 });
    expect(Array.isArray(result)).toBe(true);
  });

  it("uses default days when not specified", async () => {
    const caller = appRouter.createCaller(createContext(createAdminUser()));
    const result = await caller.analytics.revenueTimeSeries({});
    expect(Array.isArray(result)).toBe(true);
  });

  it("uses default limit when not specified", async () => {
    const caller = appRouter.createCaller(createContext(createAdminUser()));
    const result = await caller.analytics.topProducts({});
    expect(Array.isArray(result)).toBe(true);
  });
});
