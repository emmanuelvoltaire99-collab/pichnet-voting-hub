import type { CheckoutInput, CheckoutResult, PaymentProvider, VerificationResult } from "./provider";

type PayunitInitResponse = {
  status?: string;
  statusCode?: number;
  message?: string;
  data?: {
    transaction_id?: string;
    transaction_url?: string;
  };
};

type PayunitStatusResponse = {
  status?: string;
  statusCode?: number;
  message?: string;
  data?: {
    transaction_status?: string;
    transaction_gateway?: string;
    message?: string;
  };
};

function readConfig() {
  const apiUser = process.env["PAYUNIT_API_USER"]?.trim();
  const apiPassword = process.env["PAYUNIT_API_PASSWORD"]?.trim();
  const apiKey = process.env["PAYUNIT_API_KEY"]?.trim();
  const mode = (process.env["PAYUNIT_MODE"]?.trim() || "test") as "test" | "live";
  const baseUrl = (process.env["PAYUNIT_BASE_URL"]?.trim() || "https://gateway.payunit.net").replace(
    /\/$/,
    "",
  );
  const appUrl = process.env["APP_URL"]?.trim();

  if (!apiUser || !apiPassword || !apiKey || !appUrl) return null;

  return { apiUser, apiPassword, apiKey, mode, baseUrl, appUrl };
}

export function isPayunitConfigured() {
  return readConfig() !== null;
}

function toBase64(value: string) {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(value, "utf8").toString("base64");
  }
  return btoa(value);
}

function authHeaders(config: NonNullable<ReturnType<typeof readConfig>>) {
  const basic = toBase64(`${config.apiUser}:${config.apiPassword}`);
  return {
    "Content-Type": "application/json",
    Authorization: `Basic ${basic}`,
    "x-api-key": config.apiKey,
    mode: config.mode,
  };
}

export const payunitProvider: PaymentProvider = {
  id: "payunit",
  label: "PayUnit",

  async createCheckout(input: CheckoutInput): Promise<CheckoutResult> {
    const config = readConfig();
    if (!config) {
      return {
        status: "unavailable",
        message:
          "PayUnit n'est pas configuré (PAYUNIT_API_USER, PAYUNIT_API_PASSWORD, PAYUNIT_API_KEY, APP_URL).",
      };
    }

    const returnUrl = `${config.appUrl}/payment/confirmation?transaction_id=${encodeURIComponent(input.reference)}`;
    const notifyUrl = `${config.appUrl}/api/payunit/webhook`;

    const response = await fetch(`${config.baseUrl}/api/gateway/initialize`, {
      method: "POST",
      headers: authHeaders(config),
      body: JSON.stringify({
        total_amount: input.amount,
        currency: input.currency || "XAF",
        transaction_id: input.reference,
        return_url: returnUrl,
        notify_url: notifyUrl,
        payment_country: "CM",
      }),
    });

    const payload = (await response.json().catch(() => ({}))) as PayunitInitResponse;

    if (!response.ok || !payload.data?.transaction_url) {
      return {
        status: "unavailable",
        message:
          payload.message ||
          `PayUnit a refusé l'initialisation (HTTP ${response.status}). Vérifiez les clés et que APP_URL est en HTTPS.`,
      };
    }

    return {
      status: "redirect",
      redirectUrl: payload.data.transaction_url,
      message: "Redirection vers PayUnit pour finaliser le paiement.",
    };
  },

  async verifyPayment(reference: string): Promise<VerificationResult> {
    const config = readConfig();
    if (!config) {
      return {
        status: "pending",
        message: "PayUnit non configuré : vérification impossible.",
      };
    }

    const response = await fetch(
      `${config.baseUrl}/api/gateway/paymentstatus/${encodeURIComponent(reference)}`,
      {
        method: "GET",
        headers: authHeaders(config),
      },
    );

    const payload = (await response.json().catch(() => ({}))) as PayunitStatusResponse;

    if (!response.ok || !payload.data?.transaction_status) {
      return {
        status: "pending",
        message: payload.message || `Statut PayUnit indisponible (HTTP ${response.status}).`,
      };
    }

    const raw = payload.data.transaction_status.toUpperCase();
    const paymentMethod = payload.data.transaction_gateway || "payunit";

    if (raw === "SUCCESS") {
      return {
        status: "paid",
        paymentMethod,
        message: payload.data.message || "Paiement confirmé par PayUnit.",
      };
    }

    if (raw === "FAILED" || raw === "CANCELLED") {
      return {
        status: "failed",
        paymentMethod,
        message: payload.data.message || `Paiement ${raw.toLowerCase()}.`,
      };
    }

    return {
      status: "pending",
      paymentMethod,
      message: payload.data.message || `Paiement en cours (${raw}).`,
    };
  },
};
