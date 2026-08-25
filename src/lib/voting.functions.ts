import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { buildReference, getPaymentProvider } from "@/lib/payments/provider";

const REFERENCE_PATTERN = /^PICHNET[A-Z0-9]{6,50}$/;

/**
 * Crée une intention de paiement pour un pack de votes — aucun compte requis.
 * Le frontend ne peut jamais écrire dans `votes` : seul le serveur le fait,
 * après vérification du paiement.
 */
export const createVoteIntent = createServerFn({ method: "POST" })
  .inputValidator((data: { candidateId: string; packageId: string }) => {
    if (!data?.candidateId || !data?.packageId) throw new Error("Requête invalide");
    return data;
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: candidate, error: candidateError } = await supabaseAdmin
      .from("candidates")
      .select("id, is_active")
      .eq("id", data.candidateId)
      .maybeSingle();
    if (candidateError) throw new Error(candidateError.message);
    if (!candidate || !candidate.is_active) throw new Error("Candidat introuvable ou inactif");

    const { data: pack, error: packError } = await supabaseAdmin
      .from("vote_packages")
      .select("id, price, currency, is_active, vote_quantity")
      .eq("id", data.packageId)
      .maybeSingle();
    if (packError) throw new Error(packError.message);
    if (!pack || !pack.is_active) throw new Error("Pack de votes indisponible");

    const reference = buildReference();
    const provider = getPaymentProvider();
    const checkout = await provider.createCheckout({
      reference,
      amount: pack.price,
      currency: pack.currency,
      candidateId: candidate.id,
      packageId: pack.id,
    });

    const { data: payment, error } = await supabaseAdmin
      .from("payments")
      .insert({
        user_id: null,
        candidate_id: candidate.id,
        package_id: pack.id,
        amount: pack.price,
        currency: pack.currency,
        payment_method: provider.id,
        transaction_reference: reference,
        status: "pending",
      })
      .select("id, transaction_reference, amount, currency, status")
      .single();
    if (error) throw new Error(error.message);

    return {
      payment,
      voteQuantity: pack.vote_quantity,
      checkoutStatus: checkout.status,
      redirectUrl: checkout.redirectUrl ?? null,
      message: checkout.message,
      providerLabel: provider.label,
    };
  });

/**
 * Vérifie un paiement auprès de PayUnit via sa référence publique
 * (retour navigateur ou polling) et crédite les votes une seule fois.
 */
export const checkVotePayment = createServerFn({ method: "POST" })
  .inputValidator((data: { reference: string }) => {
    const reference = (data?.reference ?? "").trim();
    if (!REFERENCE_PATTERN.test(reference)) throw new Error("Référence invalide");
    return { reference };
  })
  .handler(async ({ data }) => {
    const { settlePaymentByReference } = await import("@/lib/payments/settle.server");
    return settlePaymentByReference(data.reference);
  });

/**
 * Vérifie un paiement côté serveur et, s'il est confirmé, valide les votes.
 * Réservé aux administrateurs (validation manuelle de secours).
 */
export const validatePayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { paymentId: string; forceManual?: boolean }) => {
    if (!data?.paymentId) throw new Error("Requête invalide");
    return data;
  })
  .handler(async ({ data, context }) => {
    const { data: isAdmin, error: roleError } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (roleError) throw new Error(roleError.message);
    if (!isAdmin) throw new Error("Accès refusé");

    const { settlePaymentById } = await import("@/lib/payments/settle.server");
    return settlePaymentById(
      data.paymentId,
      data.forceManual === true ? { forceManual: true } : {},
    );
  });
