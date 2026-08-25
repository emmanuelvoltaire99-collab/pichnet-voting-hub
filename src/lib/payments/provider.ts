/**
 * Abstraction PaymentProvider.
 *
 * Implémentez un prestataire (ex. PayUnit) via cette interface.
 * getPaymentProvider() retourne PayUnit dès que les secrets env sont présents.
 */

import { isPayunitConfigured, payunitProvider } from "./payunit";

export type CheckoutInput = {
  reference: string;
  amount: number;
  currency: string;
  candidateId: string;
  packageId: string;
  userId: string;
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
        "Aucun prestataire de paiement n'est encore connecté. Votre demande de vote est enregistrée et sera validée après le branchement du paiement.",
    };
  },
  async verifyPayment() {
    return {
      status: "pending",
      message: "Vérification impossible : aucun prestataire de paiement connecté.",
    };
  },
};

export function getPaymentProvider(): PaymentProvider {
  if (isPayunitConfigured()) return payunitProvider;
  return unconfiguredProvider;
}

/** Référence sans caractères spéciaux (contrainte Orange Money / PayUnit). */
export function buildReference() {
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `PICHNET${Date.now().toString(36).toUpperCase()}${random}`;
}
