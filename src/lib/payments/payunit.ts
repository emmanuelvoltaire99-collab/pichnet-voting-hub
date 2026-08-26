import type { CheckoutInput, CheckoutResult, PaymentProvider, VerificationResult } from "./provider";

type PayUnitConfig = {
  apiKey: string;
  apiUser: string;
  apiSecret: string;
  mode: "live" | "test";
  baseUrl: string;
  appUrl: string;
};

type PayUnitResponse = {
  status?: string | number;
  statusCode?: number;
  message?: string;
  data?: {
    transaction_url?: string;
    transaction_id?: string;
    transaction_status?: string;
    payment_method?: string;
    [key: string]: unknown;
  };
};

function readConfig(): PayUnitConfig | null {
  const apiKey = process.env["PAYUNIT_API_KEY"]?.trim();
  const apiUser = process.env["PAYUNIT_API_USER"]?.trim();
  const apiSecret = process.env["PAYUNIT_API_SECRET"]?.trim();
  const mode = (process.env["PAYUNIT_MODE"]?.trim().toLowerCase() === "live" ? "live" : "test") as
    | "live"
    | "test";
  const appUrl = process.env["APP_URL"]?.trim();
  if (!apiKey || !apiUser || !apiSecret || !appUrl) return null;
  return {
    apiKey,
    apiUser,
    apiSecret,
    mode,
    baseUrl: (process.env["PAYUNIT_BASE_URL"]?.trim() || "https://api.payunit.net").replace(/\/$/, ""),
    appUrl: appUrl.replace(/\/$/, ""),
  };
}

export function isPayUnitConfigured() {
  return readConfig() !== null;
}

function headers(config: PayUnitConfig) {
  const basic = Buffer.from(`${config.apiUser}:${config.apiSecret}`, "utf8").toString("base64");
  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    Authorization: `Basic ${basic}`,
    "x-api-key": config.apiKey,
    mode: config.mode,
  };
}

function normalizeStatus(value: unknown): "pending" | "paid" | "failed" {
  const status = String(value ?? "").toUpperCase();
  if (status === "SUCCESS" || status === "SUCCESSFUL" || status === "COMPLETED") return "paid";
  if (["FAILED", "CANCELLED", "CANCELED", "REJECTED", "EXPIRED"].includes(status)) return "failed";
  return "pending";
}

export const payunitProvider: PaymentProvider = {
  id: "payunit",
  label: "PayUnit (Mobile Money & cartes)",

  async createCheckout(input: CheckoutInput): Promise<CheckoutResult> {
    const config = readConfig();
    if (!config) {
      return {
        status: "unavailable",
        message:
          "PayUnit n'est pas configuré (PAYUNIT_API_KEY, PAYUNIT_API_USER, PAYUNIT_API_SECRET, PAYUNIT_MODE, APP_URL).",
      };
    }

    const response = await fetch(`${config.baseUrl}/api/gateway/initialize`, {
      method: "POST",
      headers: headers(config),
      body: JSON.stringify({
        total_amount: input.amount,
        currency: input.currency || "XAF",
        transaction_id: input.reference,
        return_url: `${config.appUrl}/payment/confirmation?transaction_id=${encodeURIComponent(input.reference)}`,
        notify_url: `${config.appUrl}/api/public/payunit/webhook`,
        purchaseRef: input.reference,
        description: "Votes MISS & MISTER PICHNET 2026",
        name: "PICHNET 2026",
      }),
    });

    const payload = (await response.json().catch(() => ({}))) as PayUnitResponse;
    const redirectUrl = payload.data?.transaction_url;

    if (!response.ok || !redirectUrl) {
      return {
        status: "unavailable",
        message: payload.message || `PayUnit a refusé l'initialisation (HTTP ${response.status}).`,
      };
    }

    return {
      status: "redirect",
      redirectUrl,
      message: "Redirection vers PayUnit pour finaliser le paiement.",
    };
  },

  async verifyPayment(reference: string): Promise<VerificationResult> {
    const config = readConfig();
    if (!config) {
      return { status: "pending", message: "PayUnit n'est pas configuré." };
    }

    const response = await fetch(
      `${config.baseUrl}/api/gateway/paymentstatus/${encodeURIComponent(reference)}`,
      { method: "GET", headers: headers(config) },
    );
    const payload = (await response.json().catch(() => ({}))) as PayUnitResponse;
    if (!response.ok) {
      return { status: "pending", message: payload.message || "Statut PayUnit indisponible." };
    }

    const status = normalizeStatus(payload.data?.transaction_status ?? payload.status);
    const result: VerificationResult = {
      status,
      message:
        status === "paid"
          ? "Paiement confirmé par PayUnit."
          : status === "failed"
            ? payload.message || "Paiement échoué ou annulé."
            : "Paiement en attente de confirmation PayUnit.",
    };
    const method = payload.data?.payment_method;
    if (typeof method === "string" && method) result.paymentMethod = method;
    return result;
  },
};
