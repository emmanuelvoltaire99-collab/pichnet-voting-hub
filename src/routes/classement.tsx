import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { CandidatePhoto } from "@/components/pichnet/candidate-photo";
import { rankingQuery, type Candidate } from "@/lib/queries";
import { candidateFullName, formatVotes, type Category } from "@/lib/pichnet";

export const Route = createFileRoute("/classement")({
  head: () => ({
    meta: [
      { title: "Classement des votes — PICHNET 2026" },
      {
        name: "description",
        content:
          "Classement en direct des candidates Miss et candidats Mister PICHNET 2026, basé uniquement sur les votes validés.",
      },
      { property: "og:title", content: "Classement des votes — PICHNET 2026" },
      { property: "og:description", content: "Podiums Miss et Mister basés sur les votes validés." },
    ],
  }),
  component: Ranking,
});

const MEDALS = ["🥇", "🥈", "🥉"];

function RankingColumn({ category, title }: { category: Category; title: string }) {
  const { data, isPending, isError } = useQuery(rankingQuery(category));
  const list = data ?? [];

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <h2 className="text-xl font-bold tracking-wide">{title}</h2>

      {isPending && (
        <div className="mt-4 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      )}

      {isError && <p className="mt-4 text-sm text-destructive">Erreur de chargement du classement.</p>}

      {!isPending && list.length === 0 && (
        <p className="mt-4 rounded-xl border border-border p-6 text-center text-sm text-muted-foreground">
          Aucun vote validé pour le moment.
        </p>
      )}

      <ol className="mt-4 space-y-3">
        {list.map((c: Candidate, index: number) => (
          <li key={c.id}>
            <Link
              to="/candidat/$id"
              params={{ id: c.id }}
              className={`flex items-center gap-3 rounded-xl border p-3 transition-colors hover:border-accent ${
                index < 3 ? "border-accent/40 ring-gold" : "border-border"
              }`}
            >
              <span className="w-8 text-center text-lg font-bold text-accent">
                {MEDALS[index] ?? index + 1}
              </span>
              <span className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-secondary">
                <CandidatePhoto path={c.photo_url} alt={candidateFullName(c)} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{candidateFullName(c)}</span>
                <span className="block text-xs text-muted-foreground">
                  N°{c.candidate_number} · {[c.city, c.region].filter(Boolean).join(" · ") || "—"}
                </span>
              </span>
              <span className="text-right">
                <span className="block font-bold text-accent">{formatVotes(c.votes_count)}</span>
                <span className="block text-xs text-muted-foreground">votes</span>
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}

function Ranking() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-bold sm:text-4xl">Classement officiel</h1>
        <p className="mt-2 text-muted-foreground">
          Basé uniquement sur les votes validés après vérification du paiement.
        </p>
      </header>
      <div className="grid gap-6 md:grid-cols-2">
        <RankingColumn category="miss" title="MISS" />
        <RankingColumn category="master" title="MISTER" />
      </div>
    </div>
  );
}
