import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { buildReference, getPaymentProvider } from "@/lib/payments/provider";

/**
 * Crée une intention de paiement pour un pack de votes.
 * Le frontend ne peut jamais écrire dans `votes` : seul le serveur le fait,
 * après vérification du paiement.
 */
export const createVoteIntent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { candidateId: string; packageId: string }) => {
    if (!data?.candidateId || !data?.packageId) throw new Error("Requête invalide");
    return data;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: candidate, error: candidateError } = await supabase
      .from("candidates")
      .select("id, is_active")
      .eq("id", data.candidateId)
      .maybeSingle();
    if (candidateError) throw new Error(candidateError.message);
    if (!candidate || !candidate.is_active) throw new Error("Candidat introuvable ou inactif");

    const { data: pack, error: packError } = await supabase
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
      userId,
    });

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: payment, error } = await supabaseAdmin
      .from("payments")
      .insert({
        user_id: userId,
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
 * Vérifie un paiement côté serveur et, s'il est confirmé, valide les votes.
 * Réservé aux administrateurs tant qu'aucun prestataire n'est branché.
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

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: payment, error } = await supabaseAdmin
      .from("payments")
      .select("id, status, candidate_id, package_id, user_id, transaction_reference")
      .eq("id", data.paymentId)
      .single();
    if (error) throw new Error(error.message);
    if (payment.status === "paid") return { status: "paid" as const, message: "Paiement déjà validé." };

    const provider = getPaymentProvider();
    const verification = payment.transaction_reference
      ? await provider.verifyPayment(payment.transaction_reference)
      : { status: "pending" as const, message: "Aucune référence de transaction." };

    const confirmed = verification.status === "paid" || data.forceManual === true;
    if (!confirmed) return { status: verification.status, message: verification.message };

    const { data: pack, error: packError } = await supabaseAdmin
      .from("vote_packages")
      .select("vote_quantity")
      .eq("id", payment.package_id)
      .single();
    if (packError) throw new Error(packError.message);

    const { error: voteError } = await supabaseAdmin.from("votes").insert({
      candidate_id: payment.candidate_id,
      user_id: payment.user_id,
      payment_id: payment.id,
      quantity: pack.vote_quantity,
    });
    if (voteError) throw new Error(voteError.message);

    const { error: updateError } = await supabaseAdmin
      .from("payments")
      .update({ status: "paid" })
      .eq("id", payment.id);
    if (updateError) throw new Error(updateError.message);

    return {
      status: "paid" as const,
      message: data.forceManual
        ? "Paiement validé manuellement par un administrateur : votes crédités."
        : "Paiement vérifié : votes crédités.",
    };
  });
