import type { CheckoutInput, CheckoutResult, PaymentProvider, VerificationResult } from "./provider";

type MonetbilResponse = {
  success?: boolean;
  payment_url?: string;
  message?: string;
};

function readConfig() {
  const serviceKey = process.env["MONETBIL_SERVICE_KEY"]?.trim();
  const appUrl = process.env["APP_URL"]?.trim();
  if (!serviceKey || !appUrl) return null;
  return { serviceKey, appUrl: appUrl.replace(/\/$/, "") };
}

export function isMonetbilConfigured() {
  return readConfig() !== null;
}

export const monetbilProvider: PaymentProvider = {
  id: "monetbil",
  label: "Monetbil",

  async createCheckout(input: CheckoutInput): Promise<CheckoutResult> {
    const config = readConfig();
    if (!config) {
      return {
        status: "unavailable",
        message: "Monetbil n'est pas configuré (MONETBIL_SERVICE_KEY et APP_URL).",
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
    body.set("notify_url", `${config.appUrl}/api/payunit/webhook`);

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
