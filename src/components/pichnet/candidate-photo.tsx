import { useQuery } from "@tanstack/react-query";
import { ImageOff } from "lucide-react";
import { photoUrlQuery } from "@/lib/queries";
import { Skeleton } from "@/components/ui/skeleton";

export function CandidatePhoto({
  path,
  alt,
  className = "",
}: {
  path: string | null;
  alt: string;
  className?: string;
}) {
  const { data, isPending } = useQuery(photoUrlQuery(path));

  if (path && isPending) {
    return <Skeleton className={`h-full w-full ${className}`} />;
  }

  if (!data) {
    return (
      <div
        className={`flex h-full w-full flex-col items-center justify-center gap-2 bg-secondary text-muted-foreground motif-cameroun ${className}`}
      >
        <ImageOff className="h-6 w-6" aria-hidden />
        <span className="text-xs">Photo à venir</span>
      </div>
    );
  }

  return (
    <img
      src={data}
      alt={alt}
      loading="lazy"
      className={`h-full w-full object-cover ${className}`}
    />
  );
}
