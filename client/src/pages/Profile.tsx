import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { Movie } from "@/types/movie";
import { TVShow } from "@/types/tvshow";
import { Button } from "@/components/ui/button";
import { Heart, Bookmark, Settings, Calendar, ArrowRight } from "lucide-react";
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
      <section className="relative overflow-hidden border-b border-white/[0.06]">
        {heroBackdrop && (
          <img src={heroBackdrop} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover opacity-[0.14]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/85 to-black" />
        <div className="relative mx-auto max-w-7xl px-4 pb-8 pt-24 sm:px-12 sm:pb-12 sm:pt-32 lg:px-20">
          <div className="flex items-center gap-4">
            <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-full bg-red-600/20 text-2xl font-semibold text-white ring-2 ring-red-500/40 sm:h-20 sm:w-20 sm:text-3xl">
              {user?.profileImageUrl ? (
                <img src={user.profileImageUrl} alt={displayName} className="h-full w-full object-cover" />
              ) : initial}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-red-400">Your profile</p>
              <h1 className="mt-1 truncate text-2xl font-semibold tracking-tight sm:text-4xl">{displayName}</h1>
              {user?.email && <p className="mt-1 truncate text-sm text-gray-400">{user.email}</p>}
            </div>
          </div>

          {memberSince && (
            <p className="mt-4 flex items-center gap-2 text-xs text-gray-400">
              <Calendar className="h-4 w-4" /> Member since {memberSince}
            </p>
          )}

          {genreNames.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2">
              {genreNames.slice(0, 5).map((genre) => (
                <span key={genre} className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs font-medium text-gray-200">
                  {genre}
                </span>
              ))}
              {genreNames.length > 5 && (
                <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs text-gray-400">
                  +{genreNames.length - 5}
                </span>
              )}
            </div>
          )}

          <div className="mt-7 grid max-w-lg grid-cols-3 gap-2">
            {[
              { label: "Favorites", value: favorites.length },
              { label: "Watchlist", value: watchlist.length },
              { label: "Genres", value: genreNames.length },
            ].map((stat) => (
              <div key={stat.label} className="rounded-2xl border border-white/[0.07] bg-white/[0.05] px-3 py-3.5">
                <div className="text-2xl font-semibold tracking-tight text-white">{stat.value}</div>
                <div className="mt-1 text-xs text-gray-400">{stat.label}</div>
              </div>
            ))}
          </div>

          <div className="mt-5 flex max-w-lg gap-3">
            <Button asChild className="h-11 flex-1 gap-2 rounded-full bg-red-600 text-white hover:bg-red-700 sm:flex-none">
              <Link href="/my-list">My List <ArrowRight className="h-4 w-4" /></Link>
            </Button>
            <Button asChild variant="outline" className="h-11 flex-1 gap-2 rounded-full border-white/15 bg-white/[0.05] text-white hover:bg-white/10 sm:flex-none">
              <Link href="/settings"><Settings className="h-4 w-4" /> Settings</Link>
            </Button>
          </div>
        </div>
      </section>
      {/* Decorative film-strip of the user's titles */}
      {showFilmstrip && (
        <div className="relative hidden border-y border-white/5 bg-[#070707] sm:block">
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
      <section className="px-4 py-8 sm:px-12 sm:py-16 lg:px-20">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Your library</h2>
              <p className="mt-1 text-sm text-gray-400">The titles you want to keep close.</p>
            </div>

            {/* Brand segmented toggle — not a generic tab bar */}
            <div className="flex w-full rounded-2xl bg-white/[0.07] p-1 sm:w-auto">
              <button
                type="button"
                aria-pressed={view === "favorites"}
                onClick={() => setView("favorites")}
                className={`flex h-11 flex-1 items-center justify-center gap-2 rounded-xl px-4 text-sm font-medium transition-colors sm:flex-none ${
                  view === "favorites"
                    ? "bg-white text-black"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                <Heart className="w-4 h-4" />
                Favorites
                <span className="text-xs opacity-70">{favorites.length}</span>
              </button>
              <button
                type="button"
                aria-pressed={view === "watchlist"}
                onClick={() => setView("watchlist")}
                className={`flex h-11 flex-1 items-center justify-center gap-2 rounded-xl px-4 text-sm font-medium transition-colors sm:flex-none ${
                  view === "watchlist"
                    ? "bg-white text-black"
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
                <Button asChild className="rounded-full bg-red-600 hover:bg-red-700">
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
                <Button asChild className="rounded-full bg-red-600 hover:bg-red-700">
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
