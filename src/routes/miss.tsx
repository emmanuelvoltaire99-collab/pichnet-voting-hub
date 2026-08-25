import { createFileRoute } from "@tanstack/react-router";
import { CandidateGrid } from "@/components/pichnet/candidate-grid";

export const Route = createFileRoute("/miss")({
  head: () => ({
    meta: [
      { title: "Candidates Miss — PICHNET 2026" },
      {
        name: "description",
        content: "Découvrez toutes les candidates Miss PICHNET 2026 : profils, régions et votes.",
      },
      { property: "og:title", content: "Candidates Miss — PICHNET 2026" },
      { property: "og:description", content: "Profils et votes des candidates Miss PICHNET 2026." },
    ],
  }),
  component: () => (
    <CandidateGrid
      category="miss"
      title="Candidates MISS 2026"
      subtitle="Élégance, engagement et culture camerounaise. Soutenez votre candidate favorite."
    />
  ),
});
