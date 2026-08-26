/**
 * Abstraction PaymentProvider.
 * L'implémentation active est Monetbil.
 */

import { isMonetbilConfigured, monetbilProvider } from "./monetbil";

export type CheckoutInput = {
  reference: string;
  amount: number;
  currency: string;
  candidateId: string;
  packageId: string;
};

export type CheckoutResult = {
  status: "redirect" | "pending" | "unavailable";
  redirectUrl?: string;
  message: string;
};

export type VerificationResult = {
  status: "pending" | "paid" | "failed";
  paymentMethod?: string;
  message: string;
};

export interface PaymentProvider {
  readonly id: string;
  readonly label: string;
  createCheckout(input: CheckoutInput): Promise<CheckoutResult>;
  verifyPayment(reference: string): Promise<VerificationResult>;
}

const unconfiguredProvider: PaymentProvider = {
  id: "unconfigured",
  label: "Aucun prestataire de paiement configuré",
  async createCheckout() {
    return {
      status: "unavailable",
      message:
        "Aucun prestataire de paiement n'est encore connecté. Configurez Monetbil côté serveur.",
    };
  },
  async verifyPayment() {
    return {
      status: "pending",
      message: "Vérification en attente de la notification Monetbil.",
    };
  },
};

export function getPaymentProvider(): PaymentProvider {
  if (isMonetbilConfigured()) return monetbilProvider;
  return unconfiguredProvider;
}

export function buildReference() {
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `PICHNET${Date.now().toString(36).toUpperCase()}${random}`;
}
