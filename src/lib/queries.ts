import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Category } from "@/lib/pichnet";

export type Candidate = {
  id: string;
  first_name: string;
  last_name: string;
  candidate_number: number;
  category: Category;
  region: string | null;
  city: string | null;
  biography: string | null;
  photo_url: string | null;
  is_active: boolean;
  votes_count: number;
  created_at: string;
};

export type VotePackage = {
  id: string;
  name: string;
  vote_quantity: number;
  price: number;
  currency: string;
  is_active: boolean;
};

const toDbCategory = (category: Category) => category.toLowerCase();

const normalize = (rows: unknown[]): Candidate[] =>
  (rows as Candidate[]).map((row) => ({
    ...row,
    category: String(row.category).toUpperCase() as Category,
  }));

export const candidatesQuery = (category?: Category) =>
  queryOptions({
    queryKey: ["candidates", category ?? "all"],
    queryFn: async (): Promise<Candidate[]> => {
      let query = supabase
        .from("candidates")
        .select("*")
        .order("candidate_number", { ascending: true });
      if (category) query = query.eq("category", toDbCategory(category));
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return normalize(data ?? []);
    },
  });

export const candidateQuery = (id: string) =>
  queryOptions({
    queryKey: ["candidate", id],
    queryFn: async (): Promise<Candidate | null> => {
      const { data, error } = await supabase.from("candidates").select("*").eq("id", id).maybeSingle();
      if (error) throw new Error(error.message);
      return data ? normalize([data])[0]! : null;
    },
  });

export const rankingQuery = (category: Category) =>
  queryOptions({
    queryKey: ["ranking", category],
    queryFn: async (): Promise<Candidate[]> => {
      const { data, error } = await supabase
        .from("candidates")
        .select("*")
        .eq("category", toDbCategory(category))
        .eq("is_active", true)
        .order("votes_count", { ascending: false })
        .order("candidate_number", { ascending: true });
      if (error) throw new Error(error.message);
      return normalize(data ?? []);
    },
  });

export const packagesQuery = (includeInactive = false) =>
  queryOptions({
    queryKey: ["vote_packages", includeInactive],
    queryFn: async (): Promise<VotePackage[]> => {
      let query = supabase.from("vote_packages").select("*").order("vote_quantity", { ascending: true });
      if (!includeInactive) query = query.eq("is_active", true);
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return (data ?? []) as VotePackage[];
    },
  });

export const paymentsQuery = () =>
  queryOptions({
    queryKey: ["payments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("*, candidates(first_name,last_name,candidate_number,category), vote_packages(name,vote_quantity)")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

export const photoUrlQuery = (path: string | null) =>
  queryOptions({
    queryKey: ["photo", path],
    enabled: Boolean(path),
    staleTime: 30 * 60 * 1000,
    queryFn: async (): Promise<string | null> => {
      if (!path) return null;
      if (path.startsWith("http")) return path;
      const { data, error } = await supabase.storage
        .from("candidate-photos")
        .createSignedUrl(path, 60 * 60);
      if (error) return null;
      return data?.signedUrl ?? null;
    },
  });
