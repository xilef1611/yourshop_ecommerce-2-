import type { Express, Request, Response } from "express";
import { parseOxapayCallback, isPaymentConfirmed, isPaymentFailed } from "./oxapay";
import * as db from "./db";

export function registerCustomRoutes(app: Express) {
  // ==================== OXAPAY CALLBACK ====================
  app.post("/api/oxapay/callback", async (req: Request, res: Response) => {
    try {
      const callbackData = parseOxapayCallback(req.body);
      console.log("[Oxapay Callback]", JSON.stringify(callbackData));

      if (!callbackData.orderId) {
        res.status(400).json({ error: "Missing orderId" });
        return;
      }

      const order = await db.getOrderByNumber(callbackData.orderId);
      if (!order) {
        res.status(404).json({ error: "Order not found" });
        return;
      }

      if (isPaymentConfirmed(callbackData.status)) {
        await db.updateOrderStatus(order.id, {
          paymentStatus: "paid",
          orderStatus: "paid_not_shipped",
          notes: `Payment confirmed via Oxapay. Track ID: ${callbackData.trackId}`,
        });
      } else if (isPaymentFailed(callbackData.status)) {
        await db.updateOrderStatus(order.id, {
          paymentStatus: callbackData.status === "expired" ? "expired" : "failed",
          notes: `Payment ${callbackData.status}. Track ID: ${callbackData.trackId}`,
        });
      }

      res.json({ status: "ok" });
    } catch (error) {
      console.error("[Oxapay Callback Error]", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ==================== PDF PACKLIST ====================
  app.get("/api/admin/packlist/:orderId", async (req: Request, res: Response) => {
    try {
      const orderId = parseInt(req.params.orderId);
      const order = await db.getOrderById(orderId);

      if (!order) {
        res.status(404).json({ error: "Order not found" });
        return;
      }

      // Generate a simple text-based packlist (HTML to print)
      const html = generatePacklistHtml(order);
      res.setHeader("Content-Type", "text/html");
      res.send(html);
    } catch (error) {
      console.error("[Packlist Error]", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
}

function generatePacklistHtml(order: any): string {
  const itemRows = (order.items || []).map((item: any) => `
    <tr>
      <td style="padding:8px;border:1px solid #ddd;">${item.productName}</td>
      <td style="padding:8px;border:1px solid #ddd;">${item.unitLabel || "-"}</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:center;">${item.quantity}</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right;">$${parseFloat(item.unitPrice).toFixed(2)}</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right;">$${parseFloat(item.lineTotal).toFixed(2)}</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:center;">☐</td>
    </tr>
  `).join("");

  return `<!DOCTYPE html>
<html>
<head>
  <title>Packlist - ${order.orderNumber}</title>
  <style>
    @media print { body { margin: 0; } .no-print { display: none; } }
    body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
    h1 { font-size: 24px; margin-bottom: 5px; }
    .header { border-bottom: 2px solid #333; padding-bottom: 15px; margin-bottom: 20px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
    .info-box { background: #f9f9f9; padding: 15px; border-radius: 5px; }
    .info-box h3 { margin: 0 0 10px 0; font-size: 14px; text-transform: uppercase; color: #666; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    th { background: #333; color: white; padding: 10px 8px; text-align: left; }
    .total-row { font-weight: bold; background: #f0f0f0; }
    .print-btn { background: #7c3aed; color: white; border: none; padding: 10px 20px; cursor: pointer; border-radius: 5px; font-size: 14px; }
  </style>
</head>
<body>
  <div class="no-print" style="margin-bottom:20px;">
    <button class="print-btn" onclick="window.print()">🖨️ Print Packlist</button>
  </div>
  <div class="header">
    <h1>📦 PACKLIST</h1>
    <p><strong>Order:</strong> ${order.orderNumber} | <strong>Date:</strong> ${new Date(order.createdAt).toLocaleDateString("de-DE")} | <strong>Status:</strong> ${order.orderStatus}</p>
  </div>
  <div class="info-grid">
    <div class="info-box">
      <h3>Customer</h3>
      <p><strong>${order.customerName}</strong></p>
      <p>${order.customerEmail}</p>
      ${order.customerPhone ? `<p>${order.customerPhone}</p>` : ""}
    </div>
    <div class="info-box">
      <h3>Shipping Address</h3>
      <p>${order.addressStreet}</p>
      <p>${order.addressPostal} ${order.addressCity}</p>
      <p>${order.addressCountry}</p>
    </div>
  </div>
  <table>
    <thead>
      <tr>
        <th>Product</th>
        <th>Variant</th>
        <th style="text-align:center;">Qty</th>
        <th style="text-align:right;">Unit Price</th>
        <th style="text-align:right;">Total</th>
        <th style="text-align:center;">✓</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
      <tr class="total-row">
        <td colspan="4" style="padding:8px;border:1px solid #ddd;text-align:right;">TOTAL:</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;">$${parseFloat(order.totalAmount).toFixed(2)}</td>
        <td style="padding:8px;border:1px solid #ddd;"></td>
      </tr>
    </tbody>
  </table>
  <div style="margin-top:30px;border-top:1px solid #ddd;padding-top:15px;">
    <p><strong>Packed by:</strong> _________________________ <strong>Date:</strong> _________________________</p>
    <p><strong>Notes:</strong> ${order.notes || "None"}</p>
  </div>
</body>
</html>`;
}
