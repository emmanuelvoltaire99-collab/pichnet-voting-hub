import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { checkVotePayment } from "@/lib/voting.functions";

export const Route = createFileRoute("/payment/confirmation")({
  validateSearch: (search: Record<string, unknown>) => ({
    transaction_id: typeof search["transaction_id"] === "string" ? (search["transaction_id"] as string) : undefined,
  }),
  head: () => ({ meta: [{ title: "Confirmation de paiement — PICHNET 2026" }, { name: "description", content: "Vérification du paiement Monetbil et crédit des votes PICHNET 2026." }] }),
  component: PaymentConfirmationPage,
});

type ConfirmResult = Awaited<ReturnType<typeof checkVotePayment>>;

function PaymentConfirmationPage() {
  const { transaction_id: transactionId } = Route.useSearch();
  const check = useServerFn(checkVotePayment);
  const started = useRef(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ConfirmResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!transactionId || started.current) return;
    started.current = true;
    setBusy(true);
    void check({ data: { reference: transactionId } })
      .then((res) => setResult(res))
      .catch((err) => setError((err as Error).message))
      .finally(() => setBusy(false));
  }, [transactionId, check]);

  return (
    <div className="mx-auto max-w-lg px-4 py-16">
      <h1 className="text-3xl font-bold">Confirmation</h1>
      <p className="mt-2 text-muted-foreground">Vérification de votre paiement auprès de Monetbil.</p>
      {!transactionId && <div className="mt-8 rounded-2xl border border-border bg-card p-5"><p className="flex items-center gap-2 text-destructive"><XCircle className="h-5 w-5" /> Référence de transaction manquante.</p><Button asChild className="mt-4"><Link to="/vote" search={{ candidate: undefined }}>Retour au vote</Link></Button></div>}
      {busy && <p className="mt-8 flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Vérification en cours…</p>}
      {error && <div className="mt-8 rounded-2xl border border-destructive/40 bg-card p-5"><p className="flex items-center gap-2 text-destructive"><XCircle className="h-5 w-5" /> {error}</p><Button asChild className="mt-4" variant="outline"><Link to="/vote" search={{ candidate: undefined }}>Réessayer plus tard</Link></Button></div>}
      {result && <div className="mt-8 rounded-2xl border border-border bg-card p-5">{result.status === "paid" ? <p className="flex items-center gap-2 font-medium text-primary"><CheckCircle2 className="h-5 w-5" /> Paiement confirmé</p> : result.status === "failed" ? <p className="flex items-center gap-2 font-medium text-destructive"><XCircle className="h-5 w-5" /> Paiement échoué</p> : <p className="flex items-center gap-2 font-medium"><Loader2 className="h-5 w-5" /> Paiement en attente</p>}<p className="mt-2 text-sm text-muted-foreground">{result.message}</p>{result.voteQuantity != null && result.status === "paid" && <p className="mt-3 text-sm">{result.votesAdded ? "Crédités" : "Déjà crédités"} : <strong>{result.voteQuantity} votes</strong></p>}<div className="mt-5 flex flex-wrap gap-3"><Button asChild><Link to="/classement">Voir le classement</Link></Button><Button asChild variant="outline"><Link to="/vote" search={{ candidate: undefined }}>Voter à nouveau</Link></Button></div></div>}
    </div>
  );
}
