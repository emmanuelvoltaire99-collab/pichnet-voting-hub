import { createFileRoute } from "@tanstack/react-router";
import { verifyMonetbilSignature } from "@/lib/payments/monetbil";

/**
 * Endpoint conservé à cette URL pour ne pas casser la configuration existante.
 * Le traitement est désormais Monetbil.
 */
export const Route = createFileRoute("/api/payunit/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const contentType = request.headers.get("content-type") ?? "";
          const params: Record<string, string> = {};

          if (contentType.includes("application/json")) {
            const body = (await request.json()) as Record<string, unknown>;
            for (const [key, value] of Object.entries(body)) {
              if (typeof value === "string" || typeof value === "number") params[key] = String(value);
            }
          } else {
            const form = await request.formData();
            for (const [key, value] of form.entries()) {
              if (typeof value === "string") params[key] = value;
            }
          }

          const paymentRef = params.payment_ref || params.transaction_id;
          if (!paymentRef) {
            return Response.json({ ok: false, error: "payment_ref manquant" }, { status: 400 });
          }

          if (!verifyMonetbilSignature(params)) {
            return Response.json({ ok: false, error: "signature invalide" }, { status: 401 });
          }

          const status = (params.status || "").toLowerCase();
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

          const { data: payment, error: paymentError } = await supabaseAdmin
            .from("payments")
            .select("id, status, candidate_id, package_id, user_id, transaction_reference, amount, currency")
            .eq("transaction_reference", paymentRef)
            .maybeSingle();

          if (paymentError) throw new Error(paymentError.message);
          if (!payment) return Response.json({ ok: false, error: "paiement introuvable" }, { status: 404 });

          if (status !== "success") {
            if (status === "failed" || status === "cancelled") {
              await supabaseAdmin.from("payments").update({ status: "failed" }).eq("id", payment.id);
            }
            return Response.json({ ok: true, status: status || "pending", votesAdded: false });
          }

          if (Number(params.amount) !== Number(payment.amount) || (params.currency && params.currency !== payment.currency)) {
            return Response.json({ ok: false, error: "montant ou devise incohérent" }, { status: 400 });
          }

          const { data: existingVote } = await supabaseAdmin
            .from("votes")
            .select("id, quantity")
            .eq("payment_id", payment.id)
            .maybeSingle();

          if (existingVote) {
            await supabaseAdmin.from("payments").update({ status: "paid", payment_method: "monetbil" }).eq("id", payment.id);
            return Response.json({ ok: true, status: "success", votesAdded: false, voteQuantity: existingVote.quantity });
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

          const { error: paymentUpdateError } = await supabaseAdmin
            .from("payments")
            .update({ status: "paid", payment_method: "monetbil" })
            .eq("id", payment.id);
          if (paymentUpdateError) throw new Error(paymentUpdateError.message);

          return Response.json({ ok: true, status: "success", votesAdded: true, voteQuantity: pack.vote_quantity });
        } catch (error) {
          console.error("[monetbil webhook]", error);
          return Response.json({ ok: false, error: (error as Error).message }, { status: 500 });
        }
      },
    },
  },
});
