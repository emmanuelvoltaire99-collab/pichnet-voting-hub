import { createFileRoute } from "@tanstack/react-router";
import { CandidateGrid } from "@/components/pichnet/candidate-grid";

export const Route = createFileRoute("/master")({
  head: () => ({
    meta: [
      { title: "Candidats Mister — PICHNET 2026" },
      {
        name: "description",
        content: "Découvrez tous les candidats Mister PICHNET 2026 : profils, régions et votes.",
      },
      { property: "og:title", content: "Candidats Mister — PICHNET 2026" },
      { property: "og:description", content: "Profils et votes des candidats Mister PICHNET 2026." },
    ],
  }),
  component: () => (
    <CandidateGrid
      category="master"
      title="Candidats MISTER 2026"
      subtitle="Au-delà de la beauté : une jeunesse qui inspire, s'engage et transforme."
    />
  ),
});
