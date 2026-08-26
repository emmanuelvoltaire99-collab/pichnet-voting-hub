import { createHash, timingSafeEqual } from "node:crypto";
import type { CheckoutInput, CheckoutResult, PaymentProvider, VerificationResult } from "./provider";

type MonetbilResponse = { success?: boolean; payment_url?: string; message?: string };

type MonetbilNotification = Record<string, string>;

function readConfig() {
  const serviceKey = process.env["MONETBIL_SERVICE_KEY"]?.trim();
  const serviceSecret = process.env["MONETBIL_SERVICE_SECRET"]?.trim();
  const appUrl = process.env["APP_URL"]?.trim();
  if (!serviceKey || !appUrl) return null;
  return { serviceKey, serviceSecret, appUrl: appUrl.replace(/\/$/, "") };
}

export function isMonetbilConfigured() {
  return readConfig() !== null;
}

/**
 * Monetbil notifications are signed with MD5 using the service secret and
 * notification values. We keep this verification server-side only.
 */
export function verifyMonetbilSignature(params: MonetbilNotification) {
  const secret = readConfig()?.serviceSecret;
  if (!secret) return false;

  const provided = params['sign']?.trim().toLowerCase();
  if (!provided || !/^[a-f0-9]{32}$/.test(provided)) return false;

  const values = Object.entries(params)
    .filter(([key]) => key !== "sign")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, value]) => value)
    .join("");
  const expected = createHash("md5").update(secret + values, "utf8").digest("hex");

  const a = Buffer.from(provided, "utf8");
  const b = Buffer.from(expected, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

export const monetbilProvider: PaymentProvider = {
  id: "monetbil",
  label: "Monetbil",

  async createCheckout(input: CheckoutInput): Promise<CheckoutResult> {
    const config = readConfig();
    if (!config) {
      return {
        status: "unavailable",
        message: "Monetbil n'est pas configuré (MONETBIL_SERVICE_KEY, MONETBIL_SERVICE_SECRET et APP_URL).",
      };
    }

    const body = new URLSearchParams();
    body.set("amount", String(input.amount));
    body.set("locale", "fr");
    body.set("country", "CM");
    body.set("currency", input.currency || "XAF");
    body.set("item_ref", input.packageId);
    body.set("payment_ref", input.reference);
    body.set("user", input.candidateId);
    body.set("return_url", `${config.appUrl}/payment/confirmation?transaction_id=${encodeURIComponent(input.reference)}`);
    body.set("notify_url", `${config.appUrl}/api/monetbil/webhook`);

    const response = await fetch(
      `https://api.monetbil.com/widget/v2.1/${encodeURIComponent(config.serviceKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      },
    );
    const payload = (await response.json().catch(() => ({}))) as MonetbilResponse;

    if (!response.ok || !payload.success || !payload.payment_url) {
      return {
        status: "unavailable",
        message: payload.message || `Monetbil a refusé l'initialisation (HTTP ${response.status}).`,
      };
    }

    return {
      status: "redirect",
      redirectUrl: payload.payment_url,
      message: "Redirection vers Monetbil pour finaliser le paiement.",
    };
  },

  async verifyPayment(): Promise<VerificationResult> {
    return {
      status: "pending",
      paymentMethod: "monetbil",
      message: "Paiement en attente de la notification sécurisée de Monetbil.",
    };
  },
};
