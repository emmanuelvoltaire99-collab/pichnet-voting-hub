import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Crown, Heart, Trophy, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CandidateCard } from "@/components/pichnet/candidate-card";
import { Skeleton } from "@/components/ui/skeleton";
import { candidatesQuery, packagesQuery } from "@/lib/queries";
import { formatPrice } from "@/lib/pichnet";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MISS & MASTER PICHNET 2026 — Site officiel" },
      {
        name: "description",
        content:
          "Découvrez les candidates Miss et les candidats Master PICHNET 2026, consultez leurs profils et soutenez-les par un vote.",
      },
      { property: "og:title", content: "MISS & MASTER PICHNET 2026 — Site officiel" },
      {
        property: "og:description",
        content: "La beauté, l'élégance et la culture camerounaise. Votez pour votre favori.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  const candidates = useQuery(candidatesQuery());
  const packages = useQuery(packagesQuery());
  const featured = (candidates.data ?? []).slice(0, 4);

  return (
    <div>
      <section className="relative overflow-hidden border-b border-border surface-royal">
        <div className="absolute inset-0 motif-cameroun opacity-70" aria-hidden />
        <div className="relative mx-auto max-w-6xl px-4 py-20 text-center sm:py-28">
          <p className="text-xs font-medium uppercase tracking-[0.35em] text-accent">
            Édition officielle 2026
          </p>
          <h1 className="mt-4 text-4xl font-bold leading-tight sm:text-6xl">
            MISS &amp; MASTER <span className="text-gold-gradient">PICHNET 2026</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground sm:text-lg">
            La beauté, l'élégance et la culture camerounaise.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="bg-primary hover:bg-primary/90">
              <Link to="/vote">
                <Heart className="mr-2 h-5 w-5" /> VOTER MAINTENANT
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-accent text-accent hover:bg-accent hover:text-accent-foreground"
            >
              <Link to="/miss">DÉCOUVRIR LES CANDIDATS</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-4 py-10 sm:grid-cols-3">
        {[
          { icon: Crown, title: "Miss", text: "Les candidates en lice", to: "/miss" as const },
          { icon: Users, title: "Master", text: "Les candidats en lice", to: "/master" as const },
          { icon: Trophy, title: "Classement", text: "Votes validés en direct", to: "/classement" as const },
        ].map(({ icon: Icon, title, text, to }) => (
          <Link
            key={title}
            to={to}
            className="rounded-2xl border border-border bg-card p-6 transition-colors hover:border-accent"
          >
            <Icon className="h-6 w-6 text-accent" />
            <h2 className="mt-3 text-lg font-semibold">{title}</h2>
            <p className="text-sm text-muted-foreground">{text}</p>
          </Link>
        ))}
      </section>

      <section className="mx-auto max-w-6xl px-4 py-6">
        <div className="mb-5 flex items-end justify-between">
          <h2 className="text-2xl font-bold">Candidats à l'affiche</h2>
          <Link to="/master" className="text-sm text-accent hover:underline">
            Tout voir
          </Link>
        </div>
        {candidates.isPending ? (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[3/4] rounded-2xl" />
            ))}
          </div>
        ) : featured.length === 0 ? (
          <p className="rounded-2xl border border-border bg-card p-8 text-center text-muted-foreground">
            Les candidats seront publiés prochainement.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {featured.map((c) => (
              <CandidateCard key={c.id} candidate={c} />
            ))}
          </div>
        )}
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12">
        <h2 className="text-2xl font-bold">Packs de votes</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Chaque vote soutient votre candidat favori. Packs configurés par l'organisation.
        </p>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {(packages.data ?? []).map((p) => (
            <div key={p.id} className="rounded-xl border border-border bg-card p-4 text-center">
              <p className="text-2xl font-bold text-accent">{p.vote_quantity}</p>
              <p className="text-xs uppercase tracking-widest text-muted-foreground">votes</p>
              <p className="mt-2 text-sm font-medium">{formatPrice(p.price, p.currency)}</p>
            </div>
          ))}
          {packages.isSuccess && packages.data.length === 0 && (
            <p className="col-span-full text-sm text-muted-foreground">
              Aucun pack de votes actif pour le moment.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
