import React from "react";
import { useQuery } from "@tanstack/react-query";
import { getMovieWatchProviders, getTVWatchProviders } from "@/lib/tmdb";
import { ExternalLink } from "lucide-react";

interface WatchProvidersProps {
  mediaId: number;
  mediaType: "movie" | "tv";
}

interface Provider {
  logo_path: string;
  provider_name: string;
  provider_id: number;
}

interface ProviderData {
  link?: string;
  flatrate?: Provider[];
  rent?: Provider[];
  buy?: Provider[];
  ads?: Provider[];
}

const ProviderLogo = ({ provider }: { provider: Provider }) => (
  <div className="group/provider relative" title={provider.provider_name}>
    <img
      src={`https://image.tmdb.org/t/p/w92${provider.logo_path}`}
      alt={provider.provider_name}
      className="w-10 h-10 rounded-lg transition-transform duration-200 group-hover/provider:scale-110"
      loading="lazy"
    />
  </div>
);

const ProviderSection = ({ label, providers }: { label: string; providers: Provider[] }) => {
  if (!providers || providers.length === 0) return null;

  return (
    <div className="mb-4 last:mb-0">
      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2 font-medium">{label}</p>
      <div className="flex flex-wrap gap-2">
        {providers.map((p) => (
          <ProviderLogo key={p.provider_id} provider={p} />
        ))}
      </div>
    </div>
  );
};

const WatchProviders = ({ mediaId, mediaType }: WatchProvidersProps) => {
  const { data: providerData, isLoading } = useQuery<ProviderData | null>({
    queryKey: [`${mediaType}-providers-${mediaId}`],
    queryFn: () =>
      mediaType === "movie"
        ? getMovieWatchProviders(mediaId)
        : getTVWatchProviders(mediaId),
    enabled: mediaId > 0,
    staleTime: 1000 * 60 * 30,
    gcTime: 1000 * 60 * 60,
  });

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-3">
        <div className="h-4 w-24 bg-secondary/40 rounded" />
        <div className="flex gap-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="w-10 h-10 bg-secondary/40 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (!providerData) return null;

  const hasAny =
    (providerData.flatrate && providerData.flatrate.length > 0) ||
    (providerData.rent && providerData.rent.length > 0) ||
    (providerData.buy && providerData.buy.length > 0) ||
    (providerData.ads && providerData.ads.length > 0);

  if (!hasAny) return null;

  return (
    <div className="rounded-lg border border-border bg-card/50 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-section-title font-bold">Where to Watch</h3>
        {providerData.link && (
          <a
            href={providerData.link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors"
          >
            View on TMDB <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
      <ProviderSection label="Stream" providers={providerData.flatrate || []} />
      <ProviderSection label="Free with Ads" providers={providerData.ads || []} />
      <ProviderSection label="Rent" providers={providerData.rent || []} />
      <ProviderSection label="Buy" providers={providerData.buy || []} />
      <p className="text-[10px] text-muted-foreground/60 mt-3">
        Availability data provided by JustWatch via TMDB.
      </p>
    </div>
  );
};

export default WatchProviders;
