import { createFileRoute } from "@tanstack/react-router";

/**
 * Webhook PayUnit (notify_url).
 * Accessible après déploiement HTTPS (Netlify / prod).
 */
export const Route = createFileRoute("/api/payunit/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { settlePaymentByReference } = await import("@/lib/payments/settle.server");
          const contentType = request.headers.get("content-type") ?? "";
          let transactionId: string | undefined;

          if (contentType.includes("application/json")) {
            const body = (await request.json()) as Record<string, unknown>;
            transactionId =
              (typeof body["transaction_id"] === "string" && body["transaction_id"]) ||
              (typeof body["transactionId"] === "string" && body["transactionId"]) ||
              undefined;
          } else {
            const form = await request.formData();
            const raw = form.get("transaction_id") ?? form.get("transactionId");
            transactionId = typeof raw === "string" ? raw : undefined;
          }

          if (!transactionId) {
            return Response.json({ ok: false, error: "transaction_id manquant" }, { status: 400 });
          }

          const result = await settlePaymentByReference(transactionId);
          return Response.json({ ok: true, ...result });
        } catch (error) {
          console.error("[payunit webhook]", error);
          return Response.json(
            { ok: false, error: (error as Error).message },
            { status: 500 },
          );
        }
      },
    },
  },
});
