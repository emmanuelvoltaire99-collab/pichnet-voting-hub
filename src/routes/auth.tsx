import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { PichnetLogo } from "@/components/pichnet/logo";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Connexion — MISS & MASTER PICHNET 2026" },
      {
        name: "description",
        content: "Connectez-vous pour voter et suivre vos paiements sur la plateforme PICHNET 2026.",
      },
      { property: "og:title", content: "Connexion — PICHNET 2026" },
      { property: "og:description", content: "Accédez à votre compte votant PICHNET." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (session) void navigate({ to: "/vote", search: { candidate: undefined } });
  }, [session, navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        if (!data.session) {
          toast.success("Compte créé", {
            description: "Vérifiez votre boîte mail pour confirmer votre adresse.",
          });
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      toast.error("Échec", { description: (err as Error).message });
    } finally {
      setBusy(false);
    }
  }

  async function onGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth` },
    });
    if (error) {
      toast.error("Connexion Google impossible", { description: error.message });
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-14">
      <div className="rounded-2xl border border-border bg-card p-6 card-elevated">
        <div className="flex justify-center">
          <PichnetLogo className="h-12" />
        </div>
        <h1 className="mt-4 text-center text-2xl font-bold">
          {mode === "signin" ? "Connexion" : "Créer un compte"}
        </h1>
        <p className="mt-1 text-center text-sm text-muted-foreground">
          Un compte est requis pour enregistrer vos votes en toute sécurité.
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vous@exemple.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Mot de passe</Label>
            <Input
              id="password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={busy} className="w-full bg-primary hover:bg-primary/90">
            {busy ? "Patientez…" : mode === "signin" ? "Se connecter" : "Créer mon compte"}
          </Button>
        </form>

        <Button variant="outline" className="mt-3 w-full" onClick={() => void onGoogle()}>
          Continuer avec Google
        </Button>

        <button
          type="button"
          className="mt-4 w-full text-center text-sm text-muted-foreground hover:text-foreground"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
        >
          {mode === "signin" ? "Pas encore de compte ? S'inscrire" : "Déjà inscrit ? Se connecter"}
        </button>
      </div>
    </div>
  );
}
