import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Heart, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CandidatePhoto } from "@/components/pichnet/candidate-photo";
import { candidateQuery } from "@/lib/queries";
import { CATEGORY_LABEL, candidateFullName, formatVotes, isDemo } from "@/lib/pichnet";

export const Route = createFileRoute("/candidat/$id")({
  head: () => ({
    meta: [
      { title: "Profil candidat — PICHNET 2026" },
      {
        name: "description",
        content: "Profil complet d'un candidat MISS & MISTER PICHNET 2026 et soutien par le vote.",
      },
      { property: "og:title", content: "Profil candidat — PICHNET 2026" },
      { property: "og:description", content: "Découvrez le profil du candidat et votez." },
    ],
  }),
  component: CandidateProfile,
});

function CandidateProfile() {
  const { id } = Route.useParams();
  const { data, isPending, isError, error } = useQuery(candidateQuery(id));

  if (isPending) {
    return (
      <div className="mx-auto grid max-w-5xl gap-6 px-4 py-10 md:grid-cols-2">
        <Skeleton className="aspect-[3/4] rounded-2xl" />
        <div className="space-y-4">
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <p className="mx-auto max-w-3xl px-4 py-16 text-center text-destructive">
        Erreur de chargement : {(error as Error).message}
      </p>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <h1 className="text-2xl font-bold">Candidat introuvable</h1>
        <p className="mt-2 text-muted-foreground">Ce profil n'existe pas ou n'est plus publié.</p>
        <Button asChild className="mt-6 bg-primary hover:bg-primary/90">
          <Link to="/miss">Voir les candidats</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <Link
        to={data.category === "miss" ? "/miss" : "/master"}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Retour aux candidats
      </Link>

      <div className="mt-6 grid gap-8 md:grid-cols-[minmax(0,380px)_1fr]">
        <div className="overflow-hidden rounded-2xl border border-border bg-card card-elevated">
          <div className="aspect-[3/4]">
            <CandidatePhoto path={data.photo_url} alt={candidateFullName(data)} />
          </div>
        </div>

        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-accent text-accent-foreground hover:bg-accent">
              N°{data.candidate_number}
            </Badge>
            <Badge variant="outline" className="border-border text-muted-foreground">
              {CATEGORY_LABEL[data.category]}
            </Badge>
            {isDemo(data) && (
              <Badge className="bg-magenta text-magenta-foreground hover:bg-magenta">DEMO</Badge>
            )}
            {!data.is_active && <Badge variant="destructive">Inactif</Badge>}
          </div>

          <h1 className="mt-3 text-3xl font-bold sm:text-4xl">{candidateFullName(data)}</h1>

          <p className="mt-2 flex items-center gap-2 text-muted-foreground">
            <MapPin className="h-4 w-4" />
            {[data.city, data.region].filter(Boolean).join(" · ") || "Origine à confirmer"}
          </p>

          <div className="mt-6 rounded-2xl border border-border bg-card p-5">
            <p className="text-sm text-muted-foreground">Votes validés</p>
            <p className="text-3xl font-bold text-accent">{formatVotes(data.votes_count)}</p>
          </div>

          <div className="mt-6">
            <h2 className="text-lg font-semibold">Biographie</h2>
            <p className="mt-2 whitespace-pre-line text-muted-foreground">
              {data.biography?.trim() || "La biographie de ce candidat sera publiée prochainement."}
            </p>
          </div>

          <Button asChild size="lg" className="mt-8 w-full bg-primary hover:bg-primary/90 sm:w-auto">
            <Link to="/vote" search={{ candidate: data.id }}>
              <Heart className="mr-2 h-5 w-5" /> VOTER POUR CE CANDIDAT
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
