import { createFileRoute } from "@tanstack/react-router";
import { verifyMonetbilSignature } from "@/lib/payments/monetbil";

/**
 * Monetbil server-to-server notification endpoint.
 * Votes are credited only after a verified SUCCESS notification.
 */
export const Route = createFileRoute("/api/monetbil/webhook")({
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
          if (!paymentRef) return Response.json({ ok: false, error: "payment_ref manquant" }, { status: 400 });
          if (!verifyMonetbilSignature(params)) return Response.json({ ok: false, error: "signature invalide" }, { status: 401 });

          const status = (params.status || params.transaction_status || "").toLowerCase();
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
              await supabaseAdmin.from("payments").update({ status: "failed", payment_method: "monetbil" }).eq("id", payment.id);
            }
            return Response.json({ ok: true, status: status || "pending", votesAdded: false });
          }

          if (Number(params.amount) !== Number(payment.amount) || (params.currency && params.currency !== payment.currency)) {
            return Response.json({ ok: false, error: "montant ou devise incohérent" }, { status: 400 });
          }

          // The database function performs the entire credit operation atomically
          // and is protected against duplicate webhook delivery.
          const { data: result, error: rpcError } = await supabaseAdmin.rpc("settle_paid_vote", {
            p_payment_id: payment.id,
          });

          if (rpcError) throw new Error(rpcError.message);

          return Response.json({ ok: true, status: "success", ...(result ?? {}) });
        } catch (error) {
          console.error("[monetbil webhook]", error);
          return Response.json({ ok: false, error: (error as Error).message }, { status: 500 });
        }
      },
    },
  },
});
