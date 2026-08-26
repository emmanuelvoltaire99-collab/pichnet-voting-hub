import { createFileRoute } from "@tanstack/react-router";
import { verifyMonetbilSignature } from "@/lib/payments/monetbil";

/**
 * Backward-compatible alias for the old PayUnit callback URL.
 * New Monetbil services must use /api/monetbil/webhook.
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

          const paymentRef = params['payment_ref'] || params['transaction_id'];
          if (!paymentRef || !verifyMonetbilSignature(params)) {
            return Response.json({ ok: false, error: "notification Monetbil invalide" }, { status: 400 });
          }

          const status = (params['status'] || params['transaction_status'] || "").toLowerCase();
          if (status !== "success") {
            return Response.json({ ok: true, status: status || "pending", votesAdded: false });
          }

          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data: payment, error } = await supabaseAdmin
            .from("payments")
            .select("id, amount, currency")
            .eq("transaction_reference", paymentRef)
            .maybeSingle();
          if (error) throw new Error(error.message);
          if (!payment) return Response.json({ ok: false, error: "paiement introuvable" }, { status: 404 });

          if (Number(params['amount']) !== Number(payment.amount) || (params['currency'] && params['currency'] !== payment.currency)) {
            return Response.json({ ok: false, error: "montant ou devise incohérent" }, { status: 400 });
          }

          const { settlePaymentById } = await import("@/lib/payments/settle.server");
          const result = await settlePaymentById(payment.id, { forceManual: true });

          return Response.json({ ok: true, ...result });
        } catch (error) {
          console.error("[legacy Monetbil webhook]", error);
          return Response.json({ ok: false, error: "traitement de notification impossible" }, { status: 500 });
        }
      },
    },
  },
});
