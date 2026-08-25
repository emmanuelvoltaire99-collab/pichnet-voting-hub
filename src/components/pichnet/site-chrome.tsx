import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { PichnetLogo } from "./logo";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

const NAV = [
  { to: "/", label: "Accueil", search: undefined },
  { to: "/miss", label: "Miss", search: undefined },
  { to: "/master", label: "Master", search: undefined },
  { to: "/classement", label: "Classement", search: undefined },
  { to: "/vote", label: "Voter", search: { candidate: undefined } },
] as const;

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const { user, isAdmin, signOut } = useAuth();

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link to="/" className="flex items-center gap-3" onClick={() => setOpen(false)}>
          <PichnetLogo className="h-9" />
          <span className="hidden text-xs font-medium tracking-[0.25em] text-muted-foreground sm:block">
            MISS &amp; MASTER 2026
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              search={item.search}
              activeOptions={{ exact: item.to === "/" }}
              activeProps={{ className: "text-accent" }}
              inactiveProps={{ className: "text-muted-foreground" }}
              className="rounded-md px-3 py-2 text-sm font-medium transition-colors hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
          {isAdmin && (
            <Link
              to="/admin"
              className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              Admin
            </Link>
          )}
          {user ? (
            <Button variant="ghost" size="sm" onClick={() => void signOut()}>
              Déconnexion
            </Button>
          ) : (
            <Button asChild size="sm" className="bg-primary hover:bg-primary/90">
              <Link to="/auth">Connexion</Link>
            </Button>
          )}
        </nav>

        <button
          className="rounded-md p-2 text-foreground md:hidden"
          aria-label="Menu"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <nav className="border-t border-border bg-background px-4 pb-4 md:hidden">
          {[...NAV, ...(isAdmin ? [{ to: "/admin", label: "Admin", search: undefined } as const] : [])].map((item) => (
            <Link
              key={item.to}
              to={item.to}
              search={item.search}
              onClick={() => setOpen(false)}
              className="block border-b border-border/60 py-3 text-sm font-medium text-muted-foreground"
            >
              {item.label}
            </Link>
          ))}
          {user ? (
            <Button variant="ghost" className="mt-3 w-full" onClick={() => void signOut()}>
              Déconnexion
            </Button>
          ) : (
            <Button asChild className="mt-3 w-full bg-primary hover:bg-primary/90">
              <Link to="/auth" onClick={() => setOpen(false)}>
                Connexion
              </Link>
            </Button>
          )}
        </nav>
      )}
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-border motif-cameroun">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <PichnetLogo className="h-8" />
          <p>
            MISS &amp; MASTER PICHNET 2026
            <br />
            Au-delà de la beauté : une jeunesse qui inspire.
          </p>
        </div>
        <p className="text-xs">
          Plateforme officielle · Les données marquées DEMO sont fictives et servent uniquement aux
          tests.
        </p>
      </div>
    </footer>
  );
}
