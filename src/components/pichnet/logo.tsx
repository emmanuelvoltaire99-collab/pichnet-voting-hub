import { useState } from "react";

/**
 * Logo officiel PICHNET. Le fichier /branding/pichnet-logo.png ne doit jamais
 * être redessiné ni modifié. Si le fichier est absent, on affiche un simple
 * texte de repli (aucun logo inventé).
 */
export function PichnetLogo({ className = "h-10" }: { className?: string }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <span className="font-semibold tracking-[0.3em] text-gold-gradient text-sm">PICHNET</span>
    );
  }

  return (
    <img
      src="/branding/pichnet-logo.png"
      alt="Logo PICHNET ONG"
      className={`${className} w-auto object-contain`}
      onError={() => setFailed(true)}
    />
  );
}
