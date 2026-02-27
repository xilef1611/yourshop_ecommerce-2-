import { eq, desc, like, and, or, sql, asc, gte, lte } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser, users,
  products, InsertProduct, Product,
  productVariants, InsertProductVariant, ProductVariant,
  orders, InsertOrder, Order,
  orderItems, InsertOrderItem, OrderItem,
  supportTickets, InsertSupportTicket, SupportTicket,
  ticketMessages, InsertTicketMessage, TicketMessage,
  emailCampaigns, InsertEmailCampaign, EmailCampaign,
  shippingOptions, InsertShippingOption, ShippingOption,
  coupons, InsertCoupon, Coupon,
  couponUsages, InsertCouponUsage, CouponUsage,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ==================== USER HELPERS ====================

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }

  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
    if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
    else if (user.openId === ENV.ownerOpenId) { values.role = 'admin'; updateSet.role = 'admin'; }
    if (!values.lastSignedIn) { values.lastSignedIn = new Date(); }
    if (Object.keys(updateSet).length === 0) { updateSet.lastSignedIn = new Date(); }
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) { return undefined; }
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateUserProfile(userId: number, data: { name?: string; email?: string; phone?: string; addressStreet?: string; addressCity?: string; addressPostal?: string; addressCountry?: string }) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(users).set(data).where(eq(users.id, userId));
}

// ==================== PRODUCT HELPERS ====================

export async function getAllProducts(onlyActive = true) {
  const db = await getDb();
  if (!db) return [];
  const conditions = onlyActive ? eq(products.active, 1) : undefined;
  const prods = conditions
    ? await db.select().from(products).where(conditions).orderBy(desc(products.createdAt))
    : await db.select().from(products).orderBy(desc(products.createdAt));

  const result = [];
  for (const p of prods) {
    const variants = await db.select().from(productVariants).where(eq(productVariants.productId, p.id));
    result.push({ ...p, variants });
  }
  return result;
}

export async function getProductById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const [product] = await db.select().from(products).where(eq(products.id, id)).limit(1);
  if (!product) return null;
  const variants = await db.select().from(productVariants).where(eq(productVariants.productId, id));
  return { ...product, variants };
}

export async function createProduct(data: InsertProduct) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(products).values(data);
  return { id: result[0].insertId };
}

export async function updateProduct(id: number, data: Partial<InsertProduct>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(products).set(data).where(eq(products.id, id));
}

export async function deleteProduct(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(productVariants).where(eq(productVariants.productId, id));
  await db.delete(products).where(eq(products.id, id));
}

export async function searchProducts(query: string, category?: string, minPrice?: number, maxPrice?: number, onlyAvailable?: boolean) {
  const db = await getDb();
  if (!db) return [];

  const conditions: any[] = [eq(products.active, 1)];
  if (query) {
    conditions.push(or(like(products.name, `%${query}%`), like(products.description, `%${query}%`)));
  }
  if (category) {
    conditions.push(eq(products.category, category));
  }

  const prods = await db.select().from(products).where(and(...conditions)).orderBy(desc(products.createdAt));

  const result = [];
  for (const p of prods) {
    const variants = await db.select().from(productVariants).where(eq(productVariants.productId, p.id));

    if (minPrice !== undefined || maxPrice !== undefined || onlyAvailable) {
      const validVariants = variants.filter(v => {
        const price = parseFloat(v.price);
        if (minPrice !== undefined && price < minPrice) return false;
        if (maxPrice !== undefined && price > maxPrice) return false;
        if (onlyAvailable && v.stock <= 0) return false;
        return true;
      });
      if (validVariants.length === 0) continue;
      result.push({ ...p, variants: validVariants });
    } else {
      result.push({ ...p, variants });
    }
  }
  return result;
}

// ==================== VARIANT HELPERS ====================

export async function createVariant(data: InsertProductVariant) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(productVariants).values(data);
  return { id: result[0].insertId };
}

export async function updateVariant(id: number, data: Partial<InsertProductVariant>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(productVariants).set(data).where(eq(productVariants.id, id));
}

export async function deleteVariant(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(productVariants).where(eq(productVariants.id, id));
}

// ==================== ORDER HELPERS ====================

function generateOrderNumber(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `ORD-${ts}-${rand}`;
}

export async function createOrder(data: Omit<InsertOrder, "orderNumber">, items: InsertOrderItem[]) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");

  const orderNumber = generateOrderNumber();
  const result = await db.insert(orders).values({ ...data, orderNumber });
  const orderId = result[0].insertId;

  for (const item of items) {
    await db.insert(orderItems).values({ ...item, orderId });
  }

  return { id: orderId, orderId, orderNumber };
}

export async function getOrderByNumber(orderNumber: string) {
  const db = await getDb();
  if (!db) return null;
  const [order] = await db.select().from(orders).where(eq(orders.orderNumber, orderNumber)).limit(1);
  if (!order) return null;
  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
  return { ...order, items };
}

export async function getOrderById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const [order] = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
  if (!order) return null;
  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
  return { ...order, items };
}

export async function getAllOrders() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(orders).orderBy(desc(orders.createdAt));
}

export async function getOrdersByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const userOrders = await db.select().from(orders).where(eq(orders.userId, userId)).orderBy(desc(orders.createdAt));
  const result = [];
  for (const o of userOrders) {
    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, o.id));
    result.push({ ...o, items });
  }
  return result;
}

export async function updateOrderStatus(id: number, data: { paymentStatus?: string; orderStatus?: string; oxapayTrackId?: string; oxapayPayUrl?: string; notes?: string }) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(orders).set(data as any).where(eq(orders.id, id));
}

export async function getPackableOrders() {
  const db = await getDb();
  if (!db) return [];
  const packable = await db.select().from(orders).where(eq(orders.orderStatus, "paid_not_shipped")).orderBy(asc(orders.createdAt));
  const result = [];
  for (const o of packable) {
    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, o.id));
    result.push({ ...o, items });
  }
  return result;
}

export async function getOrderByTrackId(trackId: string) {
  const db = await getDb();
  if (!db) return null;
  const [order] = await db.select().from(orders).where(eq(orders.oxapayTrackId, trackId)).limit(1);
  return order || null;
}

// ==================== SUPPORT TICKET HELPERS ====================

function generateTicketNumber(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `TKT-${ts}-${rand}`;
}

export async function createTicket(data: Omit<InsertSupportTicket, "ticketNumber">) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const ticketNumber = generateTicketNumber();
  const result = await db.insert(supportTickets).values({ ...data, ticketNumber });
  return { id: result[0].insertId, ticketNumber };
}

export async function getTicketsByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(supportTickets).where(eq(supportTickets.userId, userId)).orderBy(desc(supportTickets.createdAt));
}

export async function getAllTickets() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(supportTickets).orderBy(desc(supportTickets.createdAt));
}

export async function getTicketById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const [ticket] = await db.select().from(supportTickets).where(eq(supportTickets.id, id)).limit(1);
  if (!ticket) return null;
  const messages = await db.select().from(ticketMessages).where(eq(ticketMessages.ticketId, id)).orderBy(asc(ticketMessages.createdAt));
  return { ...ticket, messages };
}

export async function updateTicketStatus(id: number, status: string) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(supportTickets).set({ status: status as any }).where(eq(supportTickets.id, id));
}

export async function addTicketMessage(data: InsertTicketMessage) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(ticketMessages).values(data);
}

// ==================== ANALYTICS HELPERS ====================

/** KPI Summary: total revenue, order count, customer count, avg order value */
export async function getAnalyticsSummary() {
  const db = await getDb();
  if (!db) return { totalRevenue: 0, totalOrders: 0, totalCustomers: 0, avgOrderValue: 0, paidOrders: 0 };

  const [revenueRow] = await db.select({
    totalRevenue: sql<string>`COALESCE(SUM(CASE WHEN ${orders.paymentStatus} = 'paid' THEN ${orders.totalAmount} ELSE 0 END), 0)`,
    totalOrders: sql<number>`COUNT(*)`,
    paidOrders: sql<number>`SUM(CASE WHEN ${orders.paymentStatus} = 'paid' THEN 1 ELSE 0 END)`,
    avgOrderValue: sql<string>`COALESCE(AVG(CASE WHEN ${orders.paymentStatus} = 'paid' THEN ${orders.totalAmount} ELSE NULL END), 0)`,
  }).from(orders);

  const [customerRow] = await db.select({
    totalCustomers: sql<number>`COUNT(DISTINCT ${orders.customerEmail})`,
  }).from(orders);

  return {
    totalRevenue: parseFloat(revenueRow?.totalRevenue || "0"),
    totalOrders: Number(revenueRow?.totalOrders || 0),
    paidOrders: Number(revenueRow?.paidOrders || 0),
    totalCustomers: Number(customerRow?.totalCustomers || 0),
    avgOrderValue: parseFloat(revenueRow?.avgOrderValue || "0"),
  };
}

/** Revenue over time – daily aggregation for the last N days */
export async function getRevenueTimeSeries(days: number = 30) {
  const db = await getDb();
  if (!db) return [];

  const result = await db.select({
    date: sql<string>`DATE(${orders.createdAt})`.as("date"),
    revenue: sql<string>`COALESCE(SUM(CASE WHEN ${orders.paymentStatus} = 'paid' THEN ${orders.totalAmount} ELSE 0 END), 0)`.as("revenue"),
    orderCount: sql<number>`COUNT(*)`.as("orderCount"),
  }).from(orders)
    .where(sql`${orders.createdAt} >= DATE_SUB(NOW(), INTERVAL ${days} DAY)`)
    .groupBy(sql`date`)
    .orderBy(sql`date`);

  return result.map(r => ({
    date: String(r.date),
    revenue: parseFloat(String(r.revenue)),
    orderCount: Number(r.orderCount),
  }));
}

/** Order count per status */
export async function getOrderStatusDistribution() {
  const db = await getDb();
  if (!db) return [];

  const result = await db.select({
    status: orders.orderStatus,
    count: sql<number>`COUNT(*)`.as("count"),
  }).from(orders).groupBy(orders.orderStatus);

  return result.map(r => ({ status: r.status, count: Number(r.count) }));
}

/** Payment status distribution */
export async function getPaymentStatusDistribution() {
  const db = await getDb();
  if (!db) return [];

  const result = await db.select({
    status: orders.paymentStatus,
    count: sql<number>`COUNT(*)`.as("count"),
  }).from(orders).groupBy(orders.paymentStatus);

  return result.map(r => ({ status: r.status, count: Number(r.count) }));
}

/** Top selling products by quantity */
export async function getTopProducts(limit: number = 10) {
  const db = await getDb();
  if (!db) return [];

  const result = await db.select({
    productName: orderItems.productName,
    totalQuantity: sql<number>`SUM(${orderItems.quantity})`.as("totalQuantity"),
    totalRevenue: sql<string>`SUM(${orderItems.lineTotal})`.as("totalRevenue"),
    orderCount: sql<number>`COUNT(DISTINCT ${orderItems.orderId})`.as("orderCount"),
  }).from(orderItems)
    .groupBy(orderItems.productName)
    .orderBy(sql`SUM(${orderItems.quantity}) DESC`)
    .limit(limit);

  return result.map(r => ({
    productName: r.productName,
    totalQuantity: Number(r.totalQuantity),
    totalRevenue: parseFloat(String(r.totalRevenue)),
    orderCount: Number(r.orderCount),
  }));
}

/** New customers over time (daily) for the last N days */
export async function getNewCustomersTrend(days: number = 30) {
  const db = await getDb();
  if (!db) return [];

  const result = await db.select({
    date: sql<string>`DATE(${users.createdAt})`.as("date"),
    count: sql<number>`COUNT(*)`.as("count"),
  }).from(users)
    .where(sql`${users.createdAt} >= DATE_SUB(NOW(), INTERVAL ${days} DAY)`)
    .groupBy(sql`date`)
    .orderBy(sql`date`);

  return result.map(r => ({ date: String(r.date), count: Number(r.count) }));
}

/** Repeat customers: customers with more than 1 order */
export async function getRepeatCustomerStats() {
  const db = await getDb();
  if (!db) return { totalCustomers: 0, repeatCustomers: 0, repeatRate: 0 };

  const [totalRow] = await db.select({
    total: sql<number>`COUNT(DISTINCT ${orders.customerEmail})`,
  }).from(orders);

  const repeatResult = await db.select({
    email: orders.customerEmail,
    cnt: sql<number>`COUNT(*)`.as("cnt"),
  }).from(orders)
    .groupBy(orders.customerEmail)
    .having(sql`COUNT(*) > 1`);

  const totalCustomers = Number(totalRow?.total || 0);
  const repeatCustomers = repeatResult.length;
  const repeatRate = totalCustomers > 0 ? (repeatCustomers / totalCustomers) * 100 : 0;

  return { totalCustomers, repeatCustomers, repeatRate };
}

/** Revenue by category */
export async function getRevenueByCategory() {
  const db = await getDb();
  if (!db) return [];

  // Join orderItems with products to get category
  const result = await db.select({
    category: sql<string>`COALESCE(${products.category}, 'Uncategorized')`.as("category"),
    revenue: sql<string>`SUM(${orderItems.lineTotal})`.as("revenue"),
    quantity: sql<number>`SUM(${orderItems.quantity})`.as("quantity"),
  }).from(orderItems)
    .innerJoin(products, eq(orderItems.productId, products.id))
    .groupBy(products.category)
    .orderBy(sql`SUM(${orderItems.lineTotal}) DESC`);

  return result.map(r => ({
    category: String(r.category),
    revenue: parseFloat(String(r.revenue)),
    quantity: Number(r.quantity),
  }));
}

// ==================== CUSTOMER SEGMENTATION ====================

export type CustomerSegmentResult = { email: string; name: string | null };

/** Get all unique customers from orders */
export async function getCustomersBySegment(segment: string, segmentValue?: string): Promise<CustomerSegmentResult[]> {
  const db = await getDb();
  if (!db) return [];

  switch (segment) {
    case "all": {
      // All unique customers who placed orders
      const result = await db.selectDistinct({
        email: orders.customerEmail,
        name: orders.customerName,
      }).from(orders);
      return result.map(r => ({ email: r.email, name: r.name }));
    }
    case "repeat": {
      // Customers with more than 1 order
      const result = await db.select({
        email: orders.customerEmail,
        name: sql<string>`MAX(${orders.customerName})`.as("name"),
        cnt: sql<number>`COUNT(*)`.as("cnt"),
      }).from(orders)
        .groupBy(orders.customerEmail)
        .having(sql`COUNT(*) > 1`);
      return result.map(r => ({ email: r.email, name: r.name }));
    }
    case "new": {
      // Customers with exactly 1 order
      const result = await db.select({
        email: orders.customerEmail,
        name: sql<string>`MAX(${orders.customerName})`.as("name"),
        cnt: sql<number>`COUNT(*)`.as("cnt"),
      }).from(orders)
        .groupBy(orders.customerEmail)
        .having(sql`COUNT(*) = 1`);
      return result.map(r => ({ email: r.email, name: r.name }));
    }
    case "high_value": {
      // Customers whose total spend exceeds segmentValue
      const minValue = parseFloat(segmentValue || "100");
      const result = await db.select({
        email: orders.customerEmail,
        name: sql<string>`MAX(${orders.customerName})`.as("name"),
        totalSpent: sql<string>`SUM(${orders.totalAmount})`.as("totalSpent"),
      }).from(orders)
        .where(eq(orders.paymentStatus, "paid"))
        .groupBy(orders.customerEmail)
        .having(sql`SUM(${orders.totalAmount}) >= ${minValue}`);
      return result.map(r => ({ email: r.email, name: r.name }));
    }
    case "category": {
      // Customers who bought products from a specific category
      if (!segmentValue) return [];
      const result = await db.selectDistinct({
        email: orders.customerEmail,
        name: orders.customerName,
      }).from(orders)
        .innerJoin(orderItems, eq(orderItems.orderId, orders.id))
        .innerJoin(products, eq(orderItems.productId, products.id))
        .where(eq(products.category, segmentValue));
      return result.map(r => ({ email: r.email, name: r.name }));
    }
    case "registered": {
      // All registered users with email
      const result = await db.select({
        email: users.email,
        name: users.name,
      }).from(users).where(sql`${users.email} IS NOT NULL AND ${users.email} != ''`);
      return result.map(r => ({ email: r.email || "", name: r.name })).filter(r => r.email);
    }
    default:
      return [];
  }
}

/** Get segment preview count */
export async function getSegmentCount(segment: string, segmentValue?: string): Promise<number> {
  const customers = await getCustomersBySegment(segment, segmentValue);
  return customers.length;
}

// ==================== EMAIL CAMPAIGN HELPERS ====================

export async function createCampaign(data: InsertEmailCampaign) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(emailCampaigns).values(data);
  return { id: result[0].insertId };
}

export async function getAllCampaigns() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(emailCampaigns).orderBy(desc(emailCampaigns.createdAt));
}

export async function getCampaignById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const [campaign] = await db.select().from(emailCampaigns).where(eq(emailCampaigns.id, id)).limit(1);
  return campaign || null;
}

export async function updateCampaign(id: number, data: Partial<InsertEmailCampaign>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(emailCampaigns).set(data as any).where(eq(emailCampaigns.id, id));
}

export async function deleteCampaign(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(emailCampaigns).where(eq(emailCampaigns.id, id));
}

// ==================== SHIPPING OPTIONS HELPERS ====================

export async function getAllShippingOptions(onlyActive = false) {
  const db = await getDb();
  if (!db) return [];
  if (onlyActive) {
    return db.select().from(shippingOptions).where(eq(shippingOptions.active, 1)).orderBy(asc(shippingOptions.sortOrder));
  }
  return db.select().from(shippingOptions).orderBy(asc(shippingOptions.sortOrder));
}

export async function getShippingOptionById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const [option] = await db.select().from(shippingOptions).where(eq(shippingOptions.id, id)).limit(1);
  return option || null;
}

export async function createShippingOption(data: InsertShippingOption) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(shippingOptions).values(data);
  return { id: result[0].insertId };
}

export async function updateShippingOption(id: number, data: Partial<InsertShippingOption>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(shippingOptions).set(data as any).where(eq(shippingOptions.id, id));
}

export async function deleteShippingOption(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(shippingOptions).where(eq(shippingOptions.id, id));
}

// ==================== CATEGORY HELPERS ====================

export async function getAllCategories() {
  const db = await getDb();
  if (!db) return [];
  const result = await db.selectDistinct({ category: products.category }).from(products).where(and(eq(products.active, 1), sql`${products.category} IS NOT NULL AND ${products.category} != ''`));
  return result.map(r => r.category).filter(Boolean) as string[];
}

// ==================== COUPON HELPERS ====================

export async function listCoupons() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(coupons).orderBy(desc(coupons.createdAt));
}

export async function getCouponById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(coupons).where(eq(coupons.id, id)).limit(1);
  return result[0];
}

export async function getCouponByCode(code: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(coupons).where(eq(coupons.code, code.toUpperCase().trim())).limit(1);
  return result[0];
}

export async function createCoupon(data: Omit<InsertCoupon, "id" | "createdAt" | "updatedAt" | "usageCount">) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(coupons).values({ ...data, code: data.code.toUpperCase().trim() });
  return { id: Number(result[0].insertId) };
}

export async function updateCoupon(id: number, data: Partial<InsertCoupon>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  if (data.code) data.code = data.code.toUpperCase().trim();
  await db.update(coupons).set(data).where(eq(coupons.id, id));
}

export async function deleteCoupon(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(coupons).where(eq(coupons.id, id));
}

export async function validateCoupon(code: string, orderTotal: number, userId: number | null): Promise<{
  valid: boolean;
  coupon?: Coupon;
  discountAmount?: number;
  error?: string;
}> {
  const coupon = await getCouponByCode(code);
  if (!coupon) return { valid: false, error: "Invalid coupon code" };
  if (coupon.active !== 1) return { valid: false, error: "This coupon is no longer active" };
  if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) return { valid: false, error: "This coupon has expired" };
  if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) return { valid: false, error: "This coupon has reached its usage limit" };

  const minOrder = coupon.minOrderAmount ? parseFloat(String(coupon.minOrderAmount)) : 0;
  if (orderTotal < minOrder) return { valid: false, error: `Minimum order amount is $${minOrder.toFixed(2)}` };

  // Check per-user limit
  if (userId && coupon.perUserLimit) {
    const db = await getDb();
    if (db) {
      const userUsages = await db.select({ count: sql<number>`COUNT(*)` })
        .from(couponUsages)
        .where(and(eq(couponUsages.couponId, coupon.id), eq(couponUsages.userId, userId)));
      const userCount = Number(userUsages[0]?.count || 0);
      if (userCount >= coupon.perUserLimit) return { valid: false, error: "You have already used this coupon the maximum number of times" };
    }
  }

  // Calculate discount
  let discountAmount = 0;
  if (coupon.discountType === "percentage") {
    discountAmount = orderTotal * (parseFloat(String(coupon.discountValue)) / 100);
    const maxDiscount = coupon.maxDiscountAmount ? parseFloat(String(coupon.maxDiscountAmount)) : Infinity;
    discountAmount = Math.min(discountAmount, maxDiscount);
  } else {
    discountAmount = parseFloat(String(coupon.discountValue));
  }
  discountAmount = Math.min(discountAmount, orderTotal);
  discountAmount = Math.round(discountAmount * 100) / 100;

  return { valid: true, coupon, discountAmount };
}

export async function redeemCoupon(couponId: number, orderId: number, userId: number | null, discountAmount: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  // Increment usage count
  await db.update(coupons).set({ usageCount: sql`${coupons.usageCount} + 1` }).where(eq(coupons.id, couponId));
  // Log usage
  await db.insert(couponUsages).values({
    couponId,
    orderId,
    userId,
    discountAmount: discountAmount.toFixed(2),
  });
}

export async function getCouponUsages(couponId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(couponUsages).where(eq(couponUsages.couponId, couponId)).orderBy(desc(couponUsages.createdAt));
}
