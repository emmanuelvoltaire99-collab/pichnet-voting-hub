import { useQuery } from "@tanstack/react-query";
import { CandidateCard } from "./candidate-card";
import { Skeleton } from "@/components/ui/skeleton";
import { candidatesQuery } from "@/lib/queries";
import type { Category } from "@/lib/pichnet";

export function CandidateGrid({
  category,
  title,
  subtitle,
}: {
  category: Category;
  title: string;
  subtitle: string;
}) {
  const { data, isPending, isError, error } = useQuery(candidatesQuery(category));
  const active = (data ?? []).filter((c) => c.is_active);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-bold sm:text-4xl">{title}</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">{subtitle}</p>
      </header>

      {isPending && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[3/4] rounded-2xl" />
          ))}
        </div>
      )}

      {isError && (
        <p className="rounded-2xl border border-destructive/40 bg-card p-6 text-sm text-destructive">
          Impossible de charger les candidats : {(error as Error).message}
        </p>
      )}

      {!isPending && !isError && active.length === 0 && (
        <p className="rounded-2xl border border-border bg-card p-10 text-center text-muted-foreground motif-cameroun">
          Aucun candidat publié pour le moment. Revenez bientôt.
        </p>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {active.map((c) => (
          <CandidateCard key={c.id} candidate={c} />
        ))}
      </div>
    </div>
  );
}
