import { createFileRoute } from "@tanstack/react-router";

/**
 * PayUnit IPN endpoint (notify_url).
 * PayUnit ne signe pas ses notifications : on re-vérifie systématiquement
 * le statut auprès de l'API PayUnit avant de créditer les votes.
 */
export const Route = createFileRoute("/api/public/payunit/webhook")({
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

          const reference = params["transaction_id"] || params["purchaseRef"] || params["payment_ref"];
          if (!reference || !/^PICHNET[A-Z0-9]{6,50}$/.test(reference)) {
            return Response.json({ ok: false, error: "transaction_id invalide" }, { status: 400 });
          }

          // settlePaymentByReference re-interroge PayUnit et crédite les votes
          // une seule fois (idempotent en cas de notification dupliquée).
          const { settlePaymentByReference } = await import("@/lib/payments/settle.server");
          const result = await settlePaymentByReference(reference);
          return Response.json({ ok: true, ...result });
        } catch (error) {
          console.error("[payunit webhook]", error);
          return Response.json({ ok: false, error: "traitement de notification impossible" }, { status: 500 });
        }
      },
    },
  },
});
