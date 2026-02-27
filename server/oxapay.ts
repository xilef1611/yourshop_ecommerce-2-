/**
 * Oxapay Payment Integration
 * Uses the Generate Invoice endpoint for redirect-based payments
 */

const OXAPAY_API_URL = "https://api.oxapay.com/v1";

export async function createOxapayInvoice(params: {
  merchantApiKey: string;
  amount: number;
  currency?: string;
  orderId: string;
  callbackUrl: string;
  email?: string;
  description?: string;
  lifetime?: number;
}) {
  const { merchantApiKey, amount, currency = "USD", orderId, callbackUrl, email, description, lifetime = 60 } = params;

  const response = await fetch(`${OXAPAY_API_URL}/payment/invoice`, {
    method: "POST",
    headers: {
      "merchant_api_key": merchantApiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount,
      currency,
      order_id: orderId,
      callback_url: callbackUrl,
      email,
      description: description || `Order ${orderId}`,
      lifetime,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Oxapay API error: ${response.status} - ${text}`);
  }

  const data = await response.json();

  if (data.error) {
    throw new Error(`Oxapay error: ${JSON.stringify(data.error)}`);
  }

  return {
    trackId: data.data?.track_id,
    payUrl: data.data?.payment_url,
    expiredAt: data.data?.expired_at,
  };
}

/**
 * Verify callback/webhook from Oxapay
 * Oxapay sends POST with payment status updates
 */
export function parseOxapayCallback(body: any) {
  return {
    status: body.status as string,
    trackId: body.trackId as string,
    orderId: body.orderId as string,
    amount: body.amount as number,
    currency: body.currency as string,
    payAmount: body.payAmount as number,
    payCurrency: body.payCurrency as string,
    network: body.network as string,
    txID: body.txID as string,
    date: body.date as number,
  };
}

/**
 * Check if a status means the payment is confirmed
 */
export function isPaymentConfirmed(status: string): boolean {
  return status === "paid" || status === "manual_accept";
}

export function isPaymentFailed(status: string): boolean {
  return status === "expired" || status === "refunded";
}
