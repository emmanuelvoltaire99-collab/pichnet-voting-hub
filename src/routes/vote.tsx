import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Info, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CandidatePhoto } from "@/components/pichnet/candidate-photo";
import { candidatesQuery, packagesQuery } from "@/lib/queries";
import { candidateFullName, CATEGORY_LABEL, formatPrice } from "@/lib/pichnet";
import { createVoteIntent } from "@/lib/voting.functions";

export const Route = createFileRoute("/vote")({
  validateSearch: (search: Record<string, unknown>) => ({
    candidate: typeof search["candidate"] === "string" ? (search["candidate"] as string) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Voter — MISS & MISTER PICHNET 2026" },
      {
        name: "description",
        content:
          "Choisissez un candidat, sélectionnez un pack de votes et validez votre soutien à PICHNET 2026.",
      },
      { property: "og:title", content: "Voter — PICHNET 2026" },
      { property: "og:description", content: "Candidat, pack, paiement, confirmation." },
    ],
  }),
  component: VotePage,
});

type Intent = Awaited<ReturnType<typeof createVoteIntent>>;

function VotePage() {
  const { candidate: candidateId } = Route.useSearch();
  const navigate = useNavigate({ from: "/vote" });
  const candidates = useQuery(candidatesQuery());
  const packages = useQuery(packagesQuery());
  const submit = useServerFn(createVoteIntent);

  const [packageId, setPackageId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [intent, setIntent] = useState<Intent | null>(null);

  const selected = (candidates.data ?? []).find((c) => c.id === candidateId) ?? null;
  const activeCandidates = (candidates.data ?? []).filter((c) => c.is_active);

  async function onSubmit() {
    if (!selected || !packageId) return;
    setBusy(true);
    setError(null);
    try {
      const result = await submit({ data: { candidateId: selected.id, packageId } });
      setIntent(result);
      if (result.redirectUrl) window.location.href = result.redirectUrl;
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-bold sm:text-4xl">Voter</h1>
        <p className="mt-2 text-muted-foreground">
          Candidat → Pack → Paiement → Vérification serveur → Vote validé.
        </p>
      </header>

      {/* Étape 1 — candidat */}
      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="text-lg font-semibold">1. Votre candidat</h2>
        {candidates.isPending ? (
          <Skeleton className="mt-4 h-24 rounded-xl" />
        ) : selected ? (
          <div className="mt-4 flex items-center gap-4">
            <span className="h-20 w-16 overflow-hidden rounded-lg bg-secondary">
              <CandidatePhoto path={selected.photo_url} alt={candidateFullName(selected)} />
            </span>
            <div className="min-w-0">
              <p className="truncate font-semibold">{candidateFullName(selected)}</p>
              <p className="text-sm text-muted-foreground">
                N°{selected.candidate_number} · {CATEGORY_LABEL[selected.category]}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto"
              onClick={() => void navigate({ to: ".", search: { candidate: undefined } })}
            >
              Changer
            </Button>
          </div>
        ) : activeCandidates.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">Aucun candidat disponible au vote.</p>
        ) : (
          <div className="mt-4 grid max-h-72 grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2">
            {activeCandidates.map((c) => (
              <Link
                key={c.id}
                to="/vote"
                search={{ candidate: c.id }}
                className="flex items-center gap-3 rounded-xl border border-border p-2 text-sm hover:border-accent"
              >
                <span className="h-12 w-10 overflow-hidden rounded bg-secondary">
                  <CandidatePhoto path={c.photo_url} alt={candidateFullName(c)} />
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-medium">{candidateFullName(c)}</span>
                  <span className="block text-xs text-muted-foreground">
                    N°{c.candidate_number} · {CATEGORY_LABEL[c.category]}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Étape 2 — pack */}
      <section className="mt-5 rounded-2xl border border-border bg-card p-5">
        <h2 className="text-lg font-semibold">2. Votre pack de votes</h2>
        {packages.isPending ? (
          <Skeleton className="mt-4 h-20 rounded-xl" />
        ) : (packages.data ?? []).length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">Aucun pack actif pour le moment.</p>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {(packages.data ?? []).map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPackageId(p.id)}
                className={`rounded-xl border p-4 text-center transition-colors ${
                  packageId === p.id ? "border-accent ring-gold" : "border-border hover:border-accent/60"
                }`}
              >
                <span className="block text-2xl font-bold text-accent">{p.vote_quantity}</span>
                <span className="block text-xs uppercase tracking-widest text-muted-foreground">
                  votes
                </span>
                <span className="mt-1 block text-sm font-medium">
                  {formatPrice(p.price, p.currency)}
                </span>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Étape 3 — paiement */}
      <section className="mt-5 rounded-2xl border border-border bg-card p-5">
        <h2 className="text-lg font-semibold">3. Paiement</h2>

        {!intent && (
          <>
            <p className="mt-3 flex items-start gap-2 text-sm text-muted-foreground">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
              Aucun compte requis. Vous serez redirigé vers PayUnit pour payer ; les votes seront
              crédités après confirmation du paiement.
            </p>
            {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
            <Button
              className="mt-4 w-full bg-primary hover:bg-primary/90"
              size="lg"
              disabled={!selected || !packageId || busy}
              onClick={() => void onSubmit()}
            >
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Payer et voter
            </Button>
          </>
        )}

        {intent && (
          <div className="mt-4 rounded-xl border border-primary/40 bg-secondary p-4">
            <p className="flex items-center gap-2 font-medium">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              {intent.redirectUrl ? "Redirection vers PayUnit…" : "Demande enregistrée"}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">{intent.message}</p>
            <p className="mt-3 text-sm">
              Référence :{" "}
              <span className="font-mono text-accent">{intent.payment.transaction_reference}</span>
            </p>
            <Badge className="mt-3 bg-accent text-accent-foreground hover:bg-accent">
              Statut : {intent.checkoutStatus === "redirect" ? "paiement en cours" : "en attente"}
            </Badge>
            <p className="mt-3 text-xs text-muted-foreground">
              Les {intent.voteQuantity} votes seront crédités uniquement après vérification du
              paiement côté serveur.
            </p>
            {intent.redirectUrl && (
              <Button asChild className="mt-4 w-full" size="lg">
                <a href={intent.redirectUrl}>Continuer vers PayUnit</a>
              </Button>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
