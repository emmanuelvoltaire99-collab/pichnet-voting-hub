export const CATEGORIES = ["miss", "master"] as const;
export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABEL: Record<Category, string> = {
  miss: "Miss",
  master: "Master",
};

export function formatPrice(amount: number, currency = "XAF") {
  const suffix = currency === "XAF" ? "FCFA" : currency;
  return `${new Intl.NumberFormat("fr-FR").format(amount)} ${suffix}`;
}

export function formatVotes(count: number) {
  return new Intl.NumberFormat("fr-FR").format(count);
}

export function candidateFullName(c: { first_name: string; last_name: string }) {
  return `${c.first_name} ${c.last_name}`.trim();
}

export function isDemo(c: { first_name: string; last_name: string; biography?: string | null }) {
  return (
    c.first_name.toUpperCase().includes("DEMO") ||
    c.last_name.toUpperCase().includes("DEMO") ||
    (c.biography ?? "").toUpperCase().includes("DEMO")
  );
}
