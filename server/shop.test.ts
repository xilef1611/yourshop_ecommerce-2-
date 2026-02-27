import { describe, expect, it, vi, beforeEach } from "vitest";
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
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

// ==================== AUTH TESTS ====================

describe("auth.me", () => {
  it("returns null for unauthenticated user", async () => {
    const caller = appRouter.createCaller(createContext(null));
    const result = await caller.auth.me();
    expect(result).toBeNull();
  });

  it("returns user data for authenticated user", async () => {
    const user = createUser();
    const caller = appRouter.createCaller(createContext(user));
    const result = await caller.auth.me();
    expect(result).toBeDefined();
    expect(result?.openId).toBe("test-user-123");
    expect(result?.name).toBe("Test User");
    expect(result?.email).toBe("test@example.com");
  });
});

// ==================== ADMIN ACCESS TESTS ====================

describe("admin access control", () => {
  it("denies non-admin users from listing all products", async () => {
    const caller = appRouter.createCaller(createContext(createUser()));
    await expect(caller.products.listAll()).rejects.toThrow();
  });

  it("denies unauthenticated users from listing all products", async () => {
    const caller = appRouter.createCaller(createContext(null));
    await expect(caller.products.listAll()).rejects.toThrow();
  });

  it("denies non-admin users from listing all orders", async () => {
    const caller = appRouter.createCaller(createContext(createUser()));
    await expect(caller.orders.listAll()).rejects.toThrow();
  });

  it("denies non-admin users from listing all tickets", async () => {
    const caller = appRouter.createCaller(createContext(createUser()));
    await expect(caller.tickets.listAll()).rejects.toThrow();
  });

  it("denies non-admin users from creating products", async () => {
    const caller = appRouter.createCaller(createContext(createUser()));
    await expect(caller.products.create({ name: "Test Product" })).rejects.toThrow();
  });

  it("denies non-admin users from updating order status", async () => {
    const caller = appRouter.createCaller(createContext(createUser()));
    await expect(caller.orders.updateStatus({ id: 1, orderStatus: "shipped" })).rejects.toThrow();
  });

  it("denies non-admin users from deleting products", async () => {
    const caller = appRouter.createCaller(createContext(createUser()));
    await expect(caller.products.delete({ id: 1 })).rejects.toThrow();
  });
});

// ==================== PROTECTED ROUTE TESTS ====================

describe("protected routes", () => {
  it("denies unauthenticated users from viewing their orders", async () => {
    const caller = appRouter.createCaller(createContext(null));
    await expect(caller.orders.myOrders()).rejects.toThrow();
  });

  it("denies unauthenticated users from creating tickets", async () => {
    const caller = appRouter.createCaller(createContext(null));
    await expect(caller.tickets.create({ subject: "Test", message: "Test msg" })).rejects.toThrow();
  });

  it("denies unauthenticated users from viewing their tickets", async () => {
    const caller = appRouter.createCaller(createContext(null));
    await expect(caller.tickets.myTickets()).rejects.toThrow();
  });

  it("denies unauthenticated users from updating profile", async () => {
    const caller = appRouter.createCaller(createContext(null));
    await expect(caller.profile.update({ name: "New Name" })).rejects.toThrow();
  });
});

// ==================== PUBLIC ROUTE TESTS ====================

describe("public routes", () => {
  it("allows unauthenticated users to search products", async () => {
    const caller = appRouter.createCaller(createContext(null));
    // Should not throw - returns empty array from DB
    const result = await caller.products.search({ query: "" });
    expect(Array.isArray(result)).toBe(true);
  });

  it("allows unauthenticated users to list categories", async () => {
    const caller = appRouter.createCaller(createContext(null));
    const result = await caller.products.categories();
    expect(Array.isArray(result)).toBe(true);
  });

  it("allows unauthenticated users to list products", async () => {
    const caller = appRouter.createCaller(createContext(null));
    const result = await caller.products.list();
    expect(Array.isArray(result)).toBe(true);
  });
});

// ==================== INPUT VALIDATION TESTS ====================

describe("input validation", () => {
  it("rejects order creation with invalid email", async () => {
    const caller = appRouter.createCaller(createContext(null));
    await expect(caller.orders.create({
      customerName: "Test",
      customerEmail: "not-an-email",
      addressStreet: "123 Main St",
      addressCity: "Berlin",
      addressPostal: "10115",
      addressCountry: "Germany",
      items: [{ productId: 1, productName: "Test", quantity: 1, unitPrice: "10.00", lineTotal: "10.00" }],
    })).rejects.toThrow();
  });

  it("rejects order creation with empty customer name", async () => {
    const caller = appRouter.createCaller(createContext(null));
    await expect(caller.orders.create({
      customerName: "",
      customerEmail: "test@example.com",
      addressStreet: "123 Main St",
      addressCity: "Berlin",
      addressPostal: "10115",
      addressCountry: "Germany",
      items: [{ productId: 1, productName: "Test", quantity: 1, unitPrice: "10.00", lineTotal: "10.00" }],
    })).rejects.toThrow();
  });

  it("rejects ticket creation with empty subject", async () => {
    const caller = appRouter.createCaller(createContext(createUser()));
    await expect(caller.tickets.create({ subject: "", message: "Test" })).rejects.toThrow();
  });

  it("rejects ticket creation with empty message", async () => {
    const caller = appRouter.createCaller(createContext(createUser()));
    await expect(caller.tickets.create({ subject: "Test", message: "" })).rejects.toThrow();
  });
});

// ==================== OXAPAY CALLBACK PARSING ====================

describe("oxapay helpers", () => {
  it("parseOxapayCallback extracts fields correctly", async () => {
    const { parseOxapayCallback, isPaymentConfirmed, isPaymentFailed } = await import("./oxapay");

    const callback = parseOxapayCallback({
      status: "paid",
      trackId: "TRK123",
      orderId: "ORD-ABC-123",
      amount: 50,
      currency: "USD",
      payAmount: 0.0012,
      payCurrency: "BTC",
      network: "bitcoin",
      txID: "abc123",
      date: 1700000000,
    });

    expect(callback.status).toBe("paid");
    expect(callback.trackId).toBe("TRK123");
    expect(callback.orderId).toBe("ORD-ABC-123");
    expect(callback.amount).toBe(50);
    expect(callback.currency).toBe("USD");
  });

  it("isPaymentConfirmed returns true for paid status", async () => {
    const { isPaymentConfirmed } = await import("./oxapay");
    expect(isPaymentConfirmed("paid")).toBe(true);
    expect(isPaymentConfirmed("manual_accept")).toBe(true);
    expect(isPaymentConfirmed("pending")).toBe(false);
    expect(isPaymentConfirmed("expired")).toBe(false);
  });

  it("isPaymentFailed returns true for expired/refunded", async () => {
    const { isPaymentFailed } = await import("./oxapay");
    expect(isPaymentFailed("expired")).toBe(true);
    expect(isPaymentFailed("refunded")).toBe(true);
    expect(isPaymentFailed("paid")).toBe(false);
    expect(isPaymentFailed("pending")).toBe(false);
  });
});
