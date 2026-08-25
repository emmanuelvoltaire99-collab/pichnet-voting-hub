import type { Database } from "@/integrations/supabase/types";
import { getPaymentProvider } from "@/lib/payments/provider";

type PaymentRow = Database["public"]["Tables"]["payments"]["Row"];
type AdminClient = typeof import("@/integrations/supabase/client.server").supabaseAdmin;

export type SettleResult = {
  status: "pending" | "paid" | "failed";
  message: string;
  votesAdded: boolean;
  voteQuantity?: number;
};

async function creditVotesIfPaid(
  supabaseAdmin: AdminClient,
  payment: Pick<
    PaymentRow,
    "id" | "status" | "candidate_id" | "package_id" | "user_id" | "transaction_reference"
  >,
  options: { forceManual?: boolean } = {},
): Promise<SettleResult> {
  if (payment.status === "paid") {
    return { status: "paid", message: "Paiement déjà validé.", votesAdded: false };
  }

  const provider = getPaymentProvider();
  const verification = payment.transaction_reference
    ? await provider.verifyPayment(payment.transaction_reference)
    : {
        status: "pending" as const,
        message: "Aucune référence de transaction.",
        paymentMethod: undefined,
      };

  const confirmed = verification.status === "paid" || options.forceManual === true;
  if (!confirmed) {
    if (verification.status === "failed") {
      await supabaseAdmin.from("payments").update({ status: "failed" }).eq("id", payment.id);
    }
    return { status: verification.status, message: verification.message, votesAdded: false };
  }

  const { data: existingVote } = await supabaseAdmin
    .from("votes")
    .select("id, quantity")
    .eq("payment_id", payment.id)
    .maybeSingle();

  if (existingVote) {
    await supabaseAdmin.from("payments").update({ status: "paid" }).eq("id", payment.id);
    return {
      status: "paid",
      message: "Paiement déjà crédité.",
      votesAdded: false,
      voteQuantity: existingVote.quantity,
    };
  }

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
    .update({
      status: "paid",
      ...(verification.paymentMethod ? { payment_method: verification.paymentMethod } : {}),
    })
    .eq("id", payment.id);
  if (updateError) throw new Error(updateError.message);

  return {
    status: "paid",
    message: options.forceManual
      ? "Paiement validé manuellement par un administrateur : votes crédités."
      : "Paiement vérifié : votes crédités.",
    votesAdded: true,
    voteQuantity: pack.vote_quantity,
  };
}

export async function settlePaymentById(
  paymentId: string,
  options: { forceManual?: boolean } = {},
) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: payment, error } = await supabaseAdmin
    .from("payments")
    .select("id, status, candidate_id, package_id, user_id, transaction_reference")
    .eq("id", paymentId)
    .single();
  if (error) throw new Error(error.message);
  return creditVotesIfPaid(supabaseAdmin, payment, options);
}

export async function settlePaymentByReference(transactionId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: payment, error } = await supabaseAdmin
    .from("payments")
    .select("id, status, candidate_id, package_id, user_id, transaction_reference")
    .eq("transaction_reference", transactionId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!payment) throw new Error("Paiement introuvable");
  return creditVotesIfPaid(supabaseAdmin, payment);
}

export async function settleOwnedPaymentByReference(transactionId: string, userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: payment, error } = await supabaseAdmin
    .from("payments")
    .select("id, status, candidate_id, package_id, user_id, transaction_reference")
    .eq("transaction_reference", transactionId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!payment) throw new Error("Paiement introuvable pour cette référence");
  if (payment.user_id !== userId) throw new Error("Ce paiement ne vous appartient pas");
  return creditVotesIfPaid(supabaseAdmin, payment);
}
