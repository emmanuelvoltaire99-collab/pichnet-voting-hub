/**
 * Abstraction PaymentProvider.
 *
 * Le MVP ne simule AUCUN paiement réel. Le provider par défaut déclare
 * simplement qu'aucun prestataire n'est encore branché : le paiement reste
 * "pending" et aucun vote n'est créé tant qu'un paiement n'est pas vérifié
 * côté serveur.
 *
 * Pour brancher un prestataire compatible Cameroun plus tard, implémentez
 * cette interface et retournez-le depuis getPaymentProvider().
 */

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
  return unconfiguredProvider;
}

export function buildReference() {
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `PICHNET-${Date.now().toString(36).toUpperCase()}-${random}`;
}
