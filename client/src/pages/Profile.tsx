import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { Movie } from "@/types/movie";
import { TVShow } from "@/types/tvshow";
import { Button } from "@/components/ui/button";
import { Heart, Bookmark, Settings, Calendar, ArrowRight, Clapperboard } from "lucide-react";
import MediaGrid from "@/components/MediaGrid";

// Combined media type for both movies and TV shows
type MediaItem = Movie | TVShow;

interface Genre {
  id: number;
  name: string;
}

const Profile = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [view, setView] = useState<"favorites" | "watchlist">("favorites");
  const {
    preferences,
    isLoading: isPreferencesLoading,
    removeFromFavorites,
    removeFromWatchlist,
  } = useUserPreferences();

  const favorites = preferences?.favoriteMovies || [];
  const watchlist = preferences?.watchlist || [];

  const { data: allGenres } = useQuery<Genre[]>({
    queryKey: ["/api/genres"],
  });

  const displayName = user?.firstName
    ? `${user.firstName} ${user.lastName || ""}`.trim()
    : user?.email?.split("@")[0] || "Cinephile";

  const initial = (user?.firstName?.[0] || user?.email?.[0] || "Y").toUpperCase();

  const memberSince = useMemo(() => {
    if (!user?.createdAt) return null;
    return new Date(user.createdAt).toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
  }, [user?.createdAt]);

  // Resolve liked genre IDs to names
  const genreNames = useMemo(() => {
    const liked = Array.isArray(preferences?.likedGenres)
      ? preferences!.likedGenres
      : [];
    if (!liked.length || !allGenres) return [];
    return liked
      .map((id) => allGenres.find((g) => g.id.toString() === id)?.name)
      .filter(Boolean) as string[];
  }, [preferences, allGenres]);

  // Media helpers
  const getMediaTitle = (m: MediaItem) =>
    (m as any).title || (m as any).name || "Unknown";

  const getMediaReleaseYear = (m: MediaItem): string | null => {
    const d = (m as any).release_date || (m as any).first_air_date;
    return d ? new Date(d).getFullYear().toString() : null;
  };

  const getMediaPosterUrl = (m: MediaItem) =>
    (m as any).poster_path
      ? `https://image.tmdb.org/t/p/w500${(m as any).poster_path}`
      : "https://via.placeholder.com/500x750?text=No+Poster";

  // Ambient backdrop for the hero — pulled from the user's own taste.
  // Falls back through favorites → watchlist so the page always feels personal.
  const heroBackdrop = useMemo(() => {
    const pool = [...favorites, ...watchlist];
    const withBackdrop = pool.find((m) => (m as any).backdrop_path);
    const path = (withBackdrop as any)?.backdrop_path;
    return path ? `https://image.tmdb.org/t/p/original${path}` : null;
  }, [favorites, watchlist]);

  // A decorative film-strip of the user's posters. Only shown once there are
  // enough titles to actually read as a strip — with one or two items the
  // edge fades would just sit on top of a lonely poster and look broken.
  const filmstrip = useMemo(
    () =>
      [...favorites, ...watchlist]
        .filter((m) => (m as any).poster_path)
        .filter((m, i, arr) => arr.findIndex((a) => a.id === m.id) === i)
        .slice(0, 12),
    [favorites, watchlist],
  );
  const showFilmstrip = filmstrip.length >= 6;

  const handleRemoveFromWatchlist = (id: number) => {
    removeFromWatchlist(id);
    toast({ title: "Removed from Watchlist" });
  };

  const handleRemoveFromFavorites = (id: number) => {
    removeFromFavorites(id);
    toast({ title: "Removed from Favorites" });
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* ===== CINEMATIC IDENTITY HERO ===== */}
      <section className="relative overflow-hidden">
        {/* Ambient backdrop drawn from the user's own catalogue */}
        {heroBackdrop ? (
          <img
            src={heroBackdrop}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover opacity-[0.18] animate-ken-burns will-change-transform"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#1a0606] via-black to-black" />
        )}

        {/* Gradient + vignette so identity text always reads */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/85 to-black/60" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-transparent to-transparent" />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(120% 120% at 50% 30%, transparent 50%, rgba(0,0,0,0.7) 100%)",
          }}
        />

        <div className="relative px-6 sm:px-12 lg:px-20 pt-32 pb-14">
          <div className="max-w-7xl mx-auto">
            <p className="text-red-500 text-xs font-semibold uppercase tracking-[0.25em] mb-6 flex items-center gap-2">
              <Clapperboard className="w-3.5 h-3.5" />
              Member Pass
            </p>

            <div className="flex flex-col sm:flex-row items-start gap-6 sm:gap-8">
              {/* Framed avatar — reads like a film frame, not a generic circle */}
              <div className="relative shrink-0">
                <div className="absolute -inset-1.5 rounded-sm bg-gradient-to-br from-red-600 to-red-900" />
                <div className="relative h-24 w-24 sm:h-28 sm:w-28 overflow-hidden rounded-sm bg-[#0b0b0b]">
                  {user?.profileImageUrl ? (
                    <img
                      src={user.profileImageUrl}
                      alt={displayName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center font-logo text-5xl tracking-wider text-white/90">
                      {initial}
                    </div>
                  )}
                </div>
              </div>

              {/* Identity */}
              <div className="flex-1 min-w-0">
                <h1 className="font-logo tracking-wide text-4xl sm:text-6xl lg:text-7xl leading-[0.9] break-words">
                  {displayName}
                </h1>
                <div className="h-1 w-16 bg-red-600 mt-3 mb-4" />

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-400">
                  {user?.email && (
                    <span className="truncate max-w-full">{user.email}</span>
                  )}
                  {memberSince && (
                    <>
                      <span className="hidden sm:inline w-px h-3.5 bg-gray-700" />
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        Member since {memberSince}
                      </span>
                    </>
                  )}
                </div>

                {/* Genre taste */}
                {genreNames.length > 0 && (
                  <div className="mt-5 flex flex-wrap gap-2">
                    {genreNames.slice(0, 7).map((g) => (
                      <span
                        key={g}
                        className="rounded-full border border-red-600/30 bg-red-600/10 px-3 py-1 text-xs font-medium text-red-300"
                      >
                        {g}
                      </span>
                    ))}
                    {genreNames.length > 7 && (
                      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-gray-400">
                        +{genreNames.length - 7}
                      </span>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="mt-6 flex flex-wrap gap-3">
                  <Button
                    asChild
                    className="bg-red-600 hover:bg-red-700 text-white rounded-sm gap-2"
                  >
                    <Link href="/my-list">
                      Open My List <ArrowRight className="w-4 h-4" />
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    className="border-white/20 text-white hover:bg-white/10 rounded-sm gap-2"
                  >
                    <Link href="/settings">
                      <Settings className="w-4 h-4" /> Settings
                    </Link>
                  </Button>
                </div>
              </div>
            </div>

            {/* Stat ribbon — oversized font-logo numerals, festival-pass feel */}
            <div className="mt-10 grid grid-cols-3 max-w-md gap-px overflow-hidden rounded-sm border border-white/10 bg-white/10">
              {[
                { label: "Favorites", value: favorites.length },
                { label: "Watchlist", value: watchlist.length },
                { label: "Genres", value: genreNames.length },
              ].map((stat) => (
                <div key={stat.label} className="bg-[#0a0a0a] px-4 py-4 text-center">
                  <div className="font-logo text-3xl sm:text-4xl leading-none text-white">
                    {stat.value}
                  </div>
                  <div className="mt-1 text-[10px] sm:text-xs uppercase tracking-[0.2em] text-gray-500">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Decorative film-strip of the user's titles */}
      {showFilmstrip && (
        <div className="relative border-y border-white/5 bg-[#070707]">
          <div className="flex gap-1 p-1 overflow-x-auto scrollbar-hide">
            {filmstrip.map((m) => (
              <Link
                key={m.id}
                href={(m as any).title ? `/movie/${m.id}` : `/tv/${m.id}`}
                className="group relative shrink-0"
              >
                <img
                  src={`https://image.tmdb.org/t/p/w185${(m as any).poster_path}`}
                  alt={getMediaTitle(m)}
                  className="h-28 sm:h-32 w-auto object-cover opacity-60 transition-opacity duration-300 group-hover:opacity-100"
                  loading="lazy"
                />
              </Link>
            ))}
          </div>
          {/* edge fades so the strip dissolves into the page */}
          <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-[#070707] to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-[#070707] to-transparent" />
        </div>
      )}

      {/* ===== LIBRARY ===== */}
      <section className="px-6 sm:px-12 lg:px-20 py-12 sm:py-16">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
            <div>
              <p className="text-red-500 text-xs font-semibold uppercase tracking-[0.25em] mb-2">
                Your Collection
              </p>
              <h2 className="font-logo tracking-wide text-3xl sm:text-4xl">
                The Library
              </h2>
            </div>

            {/* Brand segmented toggle — not a generic tab bar */}
            <div className="inline-flex rounded-sm border border-white/10 bg-white/[0.03] p-1 self-start sm:self-auto">
              <button
                onClick={() => setView("favorites")}
                className={`flex items-center gap-2 rounded-sm px-4 py-2 text-sm font-medium transition-colors ${
                  view === "favorites"
                    ? "bg-red-600 text-white"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                <Heart className="w-4 h-4" />
                Favorites
                <span className="text-xs opacity-70">{favorites.length}</span>
              </button>
              <button
                onClick={() => setView("watchlist")}
                className={`flex items-center gap-2 rounded-sm px-4 py-2 text-sm font-medium transition-colors ${
                  view === "watchlist"
                    ? "bg-red-600 text-white"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                <Bookmark className="w-4 h-4" />
                Watchlist
                <span className="text-xs opacity-70">{watchlist.length}</span>
              </button>
            </div>
          </div>

          {view === "favorites" ? (
            <MediaGrid
              items={favorites}
              isLoading={isPreferencesLoading}
              onRemove={handleRemoveFromFavorites}
              emptyMessage="No favorites yet — the films you love will live here."
              emptyAction={
                <Button asChild className="bg-red-600 hover:bg-red-700 rounded-sm">
                  <Link href="/home">Discover titles</Link>
                </Button>
              }
              getMediaTitle={getMediaTitle}
              getMediaPosterUrl={getMediaPosterUrl}
              getMediaReleaseYear={getMediaReleaseYear}
            />
          ) : (
            <MediaGrid
              items={watchlist}
              isLoading={isPreferencesLoading}
              onRemove={handleRemoveFromWatchlist}
              emptyMessage="Your watchlist is empty — save something for later."
              emptyAction={
                <Button asChild className="bg-red-600 hover:bg-red-700 rounded-sm">
                  <Link href="/home">Discover titles</Link>
                </Button>
              }
              getMediaTitle={getMediaTitle}
              getMediaPosterUrl={getMediaPosterUrl}
              getMediaReleaseYear={getMediaReleaseYear}
            />
          )}
        </div>
      </section>
    </div>
  );
};

export default Profile;
