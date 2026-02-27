import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, adminProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { createOxapayInvoice, parseOxapayCallback, isPaymentConfirmed, isPaymentFailed } from "./oxapay";
import { storagePut } from "./storage";
import { TRPCError } from "@trpc/server";
import { notifyOwner } from "./_core/notification";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ==================== PRODUCTS ====================
  products: router({
    list: publicProcedure.query(async () => {
      return db.getAllProducts(true);
    }),
    listAll: adminProcedure.query(async () => {
      return db.getAllProducts(false);
    }),
    getById: publicProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      return db.getProductById(input.id);
    }),
    search: publicProcedure.input(z.object({
      query: z.string().optional().default(""),
      category: z.string().optional(),
      minPrice: z.number().optional(),
      maxPrice: z.number().optional(),
      onlyAvailable: z.boolean().optional(),
    })).query(async ({ input }) => {
      return db.searchProducts(input.query, input.category, input.minPrice, input.maxPrice, input.onlyAvailable);
    }),
    categories: publicProcedure.query(async () => {
      return db.getAllCategories();
    }),
    create: adminProcedure.input(z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      category: z.string().optional(),
      imageUrl: z.string().optional(),
    })).mutation(async ({ input }) => {
      return db.createProduct(input);
    }),
    update: adminProcedure.input(z.object({
      id: z.number(),
      name: z.string().optional(),
      description: z.string().optional(),
      category: z.string().optional(),
      imageUrl: z.string().optional(),
      active: z.number().optional(),
    })).mutation(async ({ input }) => {
      const { id, ...data } = input;
      await db.updateProduct(id, data);
      return { success: true };
    }),
    delete: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await db.deleteProduct(input.id);
      return { success: true };
    }),
    uploadImage: adminProcedure.input(z.object({
      fileName: z.string(),
      base64Data: z.string(),
      contentType: z.string(),
    })).mutation(async ({ input }) => {
      const buffer = Buffer.from(input.base64Data, "base64");
      const randomSuffix = Math.random().toString(36).substring(2, 8);
      const fileKey = `products/${randomSuffix}-${input.fileName}`;
      const { url } = await storagePut(fileKey, buffer, input.contentType);
      return { url };
    }),
  }),

  // ==================== VARIANTS ====================
  variants: router({
    create: adminProcedure.input(z.object({
      productId: z.number(),
      unitLabel: z.string().min(1),
      unitValue: z.string().optional(),
      price: z.string(),
      stock: z.number().optional().default(0),
    })).mutation(async ({ input }) => {
      return db.createVariant({
        productId: input.productId,
        unitLabel: input.unitLabel,
        unitValue: input.unitValue || null,
        price: input.price,
        stock: input.stock,
      });
    }),
    update: adminProcedure.input(z.object({
      id: z.number(),
      unitLabel: z.string().optional(),
      unitValue: z.string().optional(),
      price: z.string().optional(),
      stock: z.number().optional(),
      active: z.number().optional(),
    })).mutation(async ({ input }) => {
      const { id, ...data } = input;
      await db.updateVariant(id, data);
      return { success: true };
    }),
    delete: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await db.deleteVariant(input.id);
      return { success: true };
    }),
  }),

  // ==================== ORDERS ====================
  orders: router({
    create: publicProcedure.input(z.object({
      customerName: z.string().min(1),
      customerEmail: z.string().email(),
      customerPhone: z.string().optional(),
      addressStreet: z.string().min(1),
      addressCity: z.string().min(1),
      addressPostal: z.string().min(1),
      addressCountry: z.string().min(1),
      currency: z.string().optional().default("USD"),
      shippingOptionId: z.number().optional(),
      shippingCost: z.string().optional(),
      couponCode: z.string().optional(),
      items: z.array(z.object({
        productId: z.number(),
        variantId: z.number().optional(),
        productName: z.string(),
        unitLabel: z.string().optional(),
        quantity: z.number().min(1),
        unitPrice: z.string(),
        lineTotal: z.string(),
      })),
    })).mutation(async ({ input, ctx }) => {
      const itemsTotal = input.items.reduce((sum, item) => sum + parseFloat(item.lineTotal), 0);
      const shippingCost = parseFloat(input.shippingCost || "0");

      // Validate and apply coupon if provided
      let couponDiscount = 0;
      let validatedCoupon: Awaited<ReturnType<typeof db.validateCoupon>> | null = null;
      if (input.couponCode) {
        validatedCoupon = await db.validateCoupon(input.couponCode, itemsTotal, ctx.user?.id || null);
        if (!validatedCoupon.valid) {
          throw new TRPCError({ code: "BAD_REQUEST", message: validatedCoupon.error || "Invalid coupon" });
        }
        couponDiscount = validatedCoupon.discountAmount || 0;
      }

      const totalAmount = Math.max(0, itemsTotal + shippingCost - couponDiscount);
      const { items, shippingOptionId, shippingCost: _sc, couponCode, ...orderData } = input;
      const result = await db.createOrder(
        { ...orderData, totalAmount: totalAmount.toFixed(2), userId: ctx.user?.id || null },
        items.map(i => ({
          productId: i.productId,
          variantId: i.variantId || null,
          productName: i.productName,
          unitLabel: i.unitLabel || null,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          lineTotal: i.lineTotal,
          orderId: 0, // will be set by createOrder
        }))
      );

      // Redeem coupon after order created
      if (validatedCoupon?.valid && validatedCoupon.coupon) {
        try {
          await db.redeemCoupon(validatedCoupon.coupon.id, result.orderId, ctx.user?.id || null, couponDiscount);
        } catch (e) { console.warn("[Coupon] Failed to redeem coupon:", e); }
      }

      // Notify admin about new order
      const discountInfo = couponDiscount > 0 ? `\nDiscount: -$${couponDiscount.toFixed(2)} (Code: ${input.couponCode})` : "";
      try {
        await notifyOwner({
          title: `New Order: ${result.orderNumber}`,
          content: `New order from ${input.customerName} (${input.customerEmail}).\nTotal: $${totalAmount.toFixed(2)} ${input.currency}${discountInfo}\nItems: ${input.items.map(i => `${i.productName} x${i.quantity}`).join(", ")}`,
        });
      } catch (e) { console.warn("[Notification] Failed to notify about new order", e); }

      return { ...result, couponDiscount };
    }),
    getByNumber: publicProcedure.input(z.object({ orderNumber: z.string() })).query(async ({ input }) => {
      return db.getOrderByNumber(input.orderNumber);
    }),
    myOrders: protectedProcedure.query(async ({ ctx }) => {
      return db.getOrdersByUserId(ctx.user.id);
    }),
    // Admin
    listAll: adminProcedure.query(async () => {
      return db.getAllOrders();
    }),
    getById: adminProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      return db.getOrderById(input.id);
    }),
    updateStatus: adminProcedure.input(z.object({
      id: z.number(),
      paymentStatus: z.string().optional(),
      orderStatus: z.string().optional(),
      notes: z.string().optional(),
    })).mutation(async ({ input }) => {
      const { id, ...data } = input;
      await db.updateOrderStatus(id, data);
      return { success: true };
    }),
    packList: adminProcedure.query(async () => {
      return db.getPackableOrders();
    }),
  }),

  // ==================== PAYMENT ====================
  payment: router({
    initiate: publicProcedure.input(z.object({
      orderNumber: z.string(),
      origin: z.string(),
    })).mutation(async ({ input }) => {
      const order = await db.getOrderByNumber(input.orderNumber);
      if (!order) throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });

      const merchantKey = process.env.OXAPAY_MERCHANT_KEY;
      if (!merchantKey) {
        // Demo mode - no merchant key configured
        return { demo: true, orderNumber: input.orderNumber };
      }

      const callbackUrl = `${input.origin}/api/oxapay/callback`;
      const result = await createOxapayInvoice({
        merchantApiKey: merchantKey,
        amount: parseFloat(order.totalAmount),
        currency: order.currency,
        orderId: order.orderNumber,
        callbackUrl,
        email: order.customerEmail,
        description: `Order ${order.orderNumber}`,
        lifetime: 60,
      });

      await db.updateOrderStatus(order.id, {
        oxapayTrackId: result.trackId,
        oxapayPayUrl: result.payUrl,
      });

      return { payUrl: result.payUrl, trackId: result.trackId };
    }),
  }),

  // ==================== SUPPORT TICKETS ====================
  tickets: router({
    create: protectedProcedure.input(z.object({
      subject: z.string().min(1),
      message: z.string().min(1),
      orderId: z.number().optional(),
    })).mutation(async ({ input, ctx }) => {
      const ticket = await db.createTicket({
        userId: ctx.user.id,
        customerEmail: ctx.user.email || "",
        customerName: ctx.user.name || "Customer",
        subject: input.subject,
        orderId: input.orderId || null,
      });
      await db.addTicketMessage({
        ticketId: ticket.id,
        senderType: "customer",
        senderName: ctx.user.name || "Customer",
        message: input.message,
      });
      // Notify admin about new ticket
      try {
        await notifyOwner({
          title: `New Support Ticket: ${ticket.ticketNumber}`,
          content: `New ticket from ${ctx.user.name || "Customer"} (${ctx.user.email}).\nSubject: ${input.subject}\nMessage: ${input.message}`,
        });
      } catch (e) { console.warn("[Notification] Failed to notify about new ticket", e); }

      return ticket;
    }),
    myTickets: protectedProcedure.query(async ({ ctx }) => {
      return db.getTicketsByUserId(ctx.user.id);
    }),
    getById: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input, ctx }) => {
      const ticket = await db.getTicketById(input.id);
      if (!ticket) throw new TRPCError({ code: "NOT_FOUND" });
      // Allow if admin or ticket owner
      if (ctx.user.role !== "admin" && ticket.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return ticket;
    }),
    addMessage: protectedProcedure.input(z.object({
      ticketId: z.number(),
      message: z.string().min(1),
    })).mutation(async ({ input, ctx }) => {
      const ticket = await db.getTicketById(input.ticketId);
      if (!ticket) throw new TRPCError({ code: "NOT_FOUND" });
      if (ctx.user.role !== "admin" && ticket.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      await db.addTicketMessage({
        ticketId: input.ticketId,
        senderType: ctx.user.role === "admin" ? "admin" : "customer",
        senderName: ctx.user.name || (ctx.user.role === "admin" ? "Support" : "Customer"),
        message: input.message,
      });
      return { success: true };
    }),
    // Admin
    listAll: adminProcedure.query(async () => {
      return db.getAllTickets();
    }),
    updateStatus: adminProcedure.input(z.object({
      id: z.number(),
      status: z.string(),
    })).mutation(async ({ input }) => {
      await db.updateTicketStatus(input.id, input.status);
      return { success: true };
    }),
  }),

  // ==================== ANALYTICS ====================
  analytics: router({
    summary: adminProcedure.query(async () => {
      return db.getAnalyticsSummary();
    }),
    revenueTimeSeries: adminProcedure.input(z.object({
      days: z.number().optional().default(30),
    })).query(async ({ input }) => {
      return db.getRevenueTimeSeries(input.days);
    }),
    orderStatusDistribution: adminProcedure.query(async () => {
      return db.getOrderStatusDistribution();
    }),
    paymentStatusDistribution: adminProcedure.query(async () => {
      return db.getPaymentStatusDistribution();
    }),
    topProducts: adminProcedure.input(z.object({
      limit: z.number().optional().default(10),
    })).query(async ({ input }) => {
      return db.getTopProducts(input.limit);
    }),
    newCustomersTrend: adminProcedure.input(z.object({
      days: z.number().optional().default(30),
    })).query(async ({ input }) => {
      return db.getNewCustomersTrend(input.days);
    }),
    repeatCustomers: adminProcedure.query(async () => {
      return db.getRepeatCustomerStats();
    }),
    revenueByCategory: adminProcedure.query(async () => {
      return db.getRevenueByCategory();
    }),
  }),

  // ==================== MARKETING ====================
  marketing: router({
    segmentPreview: adminProcedure.input(z.object({
      segment: z.string(),
      segmentValue: z.string().optional(),
    })).query(async ({ input }) => {
      const customers = await db.getCustomersBySegment(input.segment, input.segmentValue);
      return { count: customers.length, customers: customers.slice(0, 50) };
    }),
    campaigns: router({
      list: adminProcedure.query(async () => {
        return db.getAllCampaigns();
      }),
      getById: adminProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
        return db.getCampaignById(input.id);
      }),
      create: adminProcedure.input(z.object({
        name: z.string().min(1),
        subject: z.string().min(1),
        body: z.string().min(1),
        segment: z.string(),
        segmentValue: z.string().optional(),
      })).mutation(async ({ input }) => {
        const customers = await db.getCustomersBySegment(input.segment, input.segmentValue);
        return db.createCampaign({
          ...input,
          segmentValue: input.segmentValue || null,
          recipientCount: customers.length,
          sentCount: 0,
          status: "draft",
        });
      }),
      update: adminProcedure.input(z.object({
        id: z.number(),
        name: z.string().optional(),
        subject: z.string().optional(),
        body: z.string().optional(),
        segment: z.string().optional(),
        segmentValue: z.string().optional(),
      })).mutation(async ({ input }) => {
        const { id, ...data } = input;
        if (data.segment) {
          const customers = await db.getCustomersBySegment(data.segment, data.segmentValue);
          (data as any).recipientCount = customers.length;
        }
        await db.updateCampaign(id, data);
        return { success: true };
      }),
      delete: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
        await db.deleteCampaign(input.id);
        return { success: true };
      }),
      send: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
        const campaign = await db.getCampaignById(input.id);
        if (!campaign) throw new TRPCError({ code: "NOT_FOUND", message: "Campaign not found" });
        if (campaign.status === "sent") throw new TRPCError({ code: "BAD_REQUEST", message: "Campaign already sent" });
        if (campaign.status === "sending") throw new TRPCError({ code: "BAD_REQUEST", message: "Campaign is currently being sent" });

        const customers = await db.getCustomersBySegment(campaign.segment, campaign.segmentValue || undefined);
        if (customers.length === 0) throw new TRPCError({ code: "BAD_REQUEST", message: "No recipients in this segment" });

        await db.updateCampaign(input.id, { status: "sending", recipientCount: customers.length });

        // Send notifications asynchronously
        let sentCount = 0;
        for (const customer of customers) {
          try {
            // Personalize the email body
            const personalizedBody = campaign.body
              .replace(/\{\{name\}\}/g, customer.name || "Customer")
              .replace(/\{\{email\}\}/g, customer.email);
            const personalizedSubject = campaign.subject
              .replace(/\{\{name\}\}/g, customer.name || "Customer")
              .replace(/\{\{email\}\}/g, customer.email);

            await notifyOwner({
              title: `[Marketing] ${personalizedSubject} → ${customer.email}`,
              content: `To: ${customer.name || "Customer"} <${customer.email}>\n\n${personalizedBody}`,
            });
            sentCount++;
          } catch (e) {
            console.warn(`[Marketing] Failed to send to ${customer.email}:`, e);
          }
        }

        await db.updateCampaign(input.id, {
          status: sentCount > 0 ? "sent" : "failed",
          sentCount,
          sentAt: new Date(),
        });

        return { success: true, sentCount, totalRecipients: customers.length };
      }),
    }),
  }),

  // ==================== SHIPPING OPTIONS ====================
  shipping: router({
    list: publicProcedure.query(async () => {
      return db.getAllShippingOptions(true);
    }),
    listAll: adminProcedure.query(async () => {
      return db.getAllShippingOptions(false);
    }),
    create: adminProcedure.input(z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      price: z.string(),
      currency: z.string().optional().default("USD"),
      estimatedDays: z.string().optional(),
      active: z.number().optional().default(1),
      sortOrder: z.number().optional().default(0),
    })).mutation(async ({ input }) => {
      return db.createShippingOption(input);
    }),
    update: adminProcedure.input(z.object({
      id: z.number(),
      name: z.string().optional(),
      description: z.string().optional(),
      price: z.string().optional(),
      currency: z.string().optional(),
      estimatedDays: z.string().optional(),
      active: z.number().optional(),
      sortOrder: z.number().optional(),
    })).mutation(async ({ input }) => {
      const { id, ...data } = input;
      await db.updateShippingOption(id, data);
      return { success: true };
    }),
    delete: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await db.deleteShippingOption(input.id);
      return { success: true };
    }),
  }),

  // ==================== COUPONS ====================
  coupons: router({
    // Public: validate a coupon code
    validate: publicProcedure.input(z.object({
      code: z.string().min(1),
      orderTotal: z.number().min(0),
    })).query(async ({ input, ctx }) => {
      const result = await db.validateCoupon(input.code, input.orderTotal, ctx.user?.id || null);
      return {
        valid: result.valid,
        discountAmount: result.discountAmount || 0,
        discountType: result.coupon?.discountType || null,
        discountValue: result.coupon?.discountValue ? parseFloat(String(result.coupon.discountValue)) : null,
        error: result.error || null,
      };
    }),
    // Admin: list all coupons
    list: adminProcedure.query(async () => {
      return db.listCoupons();
    }),
    create: adminProcedure.input(z.object({
      code: z.string().min(1),
      description: z.string().optional(),
      discountType: z.enum(["percentage", "fixed"]),
      discountValue: z.string(),
      minOrderAmount: z.string().optional(),
      maxDiscountAmount: z.string().optional(),
      usageLimit: z.number().optional(),
      perUserLimit: z.number().optional(),
      expiresAt: z.string().optional(), // ISO date string
      active: z.number().optional().default(1),
    })).mutation(async ({ input }) => {
      const data: any = {
        ...input,
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : undefined,
      };
      return db.createCoupon(data);
    }),
    update: adminProcedure.input(z.object({
      id: z.number(),
      code: z.string().optional(),
      description: z.string().optional(),
      discountType: z.enum(["percentage", "fixed"]).optional(),
      discountValue: z.string().optional(),
      minOrderAmount: z.string().optional(),
      maxDiscountAmount: z.string().optional(),
      usageLimit: z.number().optional(),
      perUserLimit: z.number().optional(),
      expiresAt: z.string().optional(),
      active: z.number().optional(),
    })).mutation(async ({ input }) => {
      const { id, expiresAt, ...rest } = input;
      const data: any = { ...rest };
      if (expiresAt !== undefined) data.expiresAt = expiresAt ? new Date(expiresAt) : null;
      await db.updateCoupon(id, data);
      return { success: true };
    }),
    delete: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await db.deleteCoupon(input.id);
      return { success: true };
    }),
    usages: adminProcedure.input(z.object({ couponId: z.number() })).query(async ({ input }) => {
      return db.getCouponUsages(input.couponId);
    }),
  }),

  // ==================== USER PROFILE ====================
  profile: router({
    update: protectedProcedure.input(z.object({
      name: z.string().optional(),
      email: z.string().optional(),
      phone: z.string().optional(),
      addressStreet: z.string().optional(),
      addressCity: z.string().optional(),
      addressPostal: z.string().optional(),
      addressCountry: z.string().optional(),
    })).mutation(async ({ input, ctx }) => {
      await db.updateUserProfile(ctx.user.id, input);
      return { success: true };
    }),
  }),
});

export type AppRouter = typeof appRouter;
