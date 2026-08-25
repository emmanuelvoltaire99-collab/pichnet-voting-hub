import { Link } from "@tanstack/react-router";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CandidatePhoto } from "./candidate-photo";
import { CATEGORY_LABEL, candidateFullName, formatVotes, isDemo } from "@/lib/pichnet";
import type { Candidate } from "@/lib/queries";

export function CandidateCard({ candidate }: { candidate: Candidate }) {
  return (
    <article className="group overflow-hidden rounded-2xl border border-border bg-card card-elevated transition-transform duration-200 hover:-translate-y-1">
      <Link
        to="/candidat/$id"
        params={{ id: candidate.id }}
        className="block aspect-[3/4] overflow-hidden bg-secondary"
      >
        <CandidatePhoto path={candidate.photo_url} alt={candidateFullName(candidate)} />
      </Link>

      <div className="space-y-3 p-4">
        <div className="flex items-center gap-2">
          <Badge className="bg-accent text-accent-foreground hover:bg-accent">
            N°{candidate.candidate_number}
          </Badge>
          <Badge variant="outline" className="border-border text-muted-foreground">
            {CATEGORY_LABEL[candidate.category]}
          </Badge>
          {isDemo(candidate) && (
            <Badge className="bg-magenta text-magenta-foreground hover:bg-magenta">DEMO</Badge>
          )}
        </div>

        <div>
          <h3 className="truncate text-base font-semibold">{candidateFullName(candidate)}</h3>
          <p className="truncate text-sm text-muted-foreground">
            {[candidate.city, candidate.region].filter(Boolean).join(" · ") || "Origine à confirmer"}
          </p>
        </div>

        <div className="flex items-center justify-between gap-2">
          <span className="text-sm text-muted-foreground">
            <strong className="text-accent">{formatVotes(candidate.votes_count)}</strong> votes
          </span>
          <Button asChild size="sm" className="bg-primary hover:bg-primary/90">
            <Link to="/vote" search={{ candidate: candidate.id }}>
              <Heart className="mr-1 h-4 w-4" /> VOTER
            </Link>
          </Button>
        </div>
      </div>
    </article>
  );
}
