import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Search as SearchIcon, ArrowLeft } from "lucide-react";
import MovieCard from "@/components/MovieCard";
import HorizontalSearchFilters from "@/components/HorizontalSearchFilters";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { Movie } from "@/types/movie";
import { TVShow } from "@/types/tvshow";
import {
  searchMovies,
  searchTVShows,
  searchMoviesWithFilters,
  searchTVShowsWithFilters,
  discoverMoviesWithFilters,
  discoverTVShowsWithFilters,
  getPopularMovies,
  getPopularTVShows,
  SearchFilters as SearchFiltersType,
} from "@/lib/tmdb";

const Search = () => {
  const [location, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [filters, setFilters] = useState<SearchFiltersType>({});

  // Parse query + filters from URL on load / navigation
  useEffect(() => {
    const params = new URLSearchParams(location.split("?")[1] || "");
    const q = params.get("q") ?? "";
    setSearchQuery(q);
    setDebouncedQuery(q);

    const parsed: SearchFiltersType = {};
    const year    = params.get("year");
    const rating  = params.get("rating");
    const sortBy  = params.get("sortBy");
    const genre   = params.get("genre");
    const country = params.get("country");
    const lang    = params.get("language");

    if (year)    parsed.year    = parseInt(year);
    if (rating)  parsed.rating  = parseInt(rating);
    if (sortBy)  parsed.sortBy  = sortBy as SearchFiltersType["sortBy"];
    if (genre)   parsed.genre   = parseInt(genre);
    if (country) parsed.country = country;
    if (lang)    parsed.language = lang;

    setFilters(parsed);
  }, [location]);

  // Debounce the search input
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(searchQuery), 400);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const hasQuery   = debouncedQuery.length > 0;
  const hasFilters = Object.values(filters).some(v => v !== undefined);
  const showResults = hasQuery || hasFilters;

  // Push URL whenever query or filters change
  const syncUrl = (q: string, f: SearchFiltersType) => {
    const params = new URLSearchParams();
    if (q)         params.set("q",        q);
    if (f.year)    params.set("year",     f.year.toString());
    if (f.rating)  params.set("rating",   f.rating.toString());
    if (f.sortBy)  params.set("sortBy",   f.sortBy);
    if (f.genre)   params.set("genre",    f.genre!.toString());
    if (f.country) params.set("country",  f.country);
    if (f.language)params.set("language", f.language);
    navigate(`/search?${params.toString()}`);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    syncUrl(searchQuery.trim(), filters);
    setDebouncedQuery(searchQuery.trim());
  };

  const handleFiltersChange = (newFilters: SearchFiltersType) => {
    setFilters(newFilters);
    syncUrl(searchQuery.trim(), newFilters);
  };

  // ── Movie results ──────────────────────────────────────────────────────────
  const { data: movieResults, isLoading: isMovieLoading } = useQuery({
    queryKey: ["search/movies", debouncedQuery, filters],
    queryFn: () => {
      if (hasQuery && hasFilters) return searchMoviesWithFilters(debouncedQuery, filters);
      if (hasQuery)               return searchMovies(debouncedQuery);
      return discoverMoviesWithFilters(filters);
    },
    enabled: showResults,
    retry: 1,
  });

  // ── TV results ─────────────────────────────────────────────────────────────
  const { data: tvResults, isLoading: isTVLoading } = useQuery({
    queryKey: ["search/tv", debouncedQuery, filters],
    queryFn: () => {
      if (hasQuery && hasFilters) return searchTVShowsWithFilters(debouncedQuery, filters);
      if (hasQuery)               return searchTVShows(debouncedQuery);
      return discoverTVShowsWithFilters(filters);
    },
    enabled: showResults,
    retry: 1,
  });

  // ── Popular (shown only when no query and no filters) ──────────────────────
  const { data: popularMovies, isLoading: isPopularMoviesLoading } = useQuery({
    queryKey: ["/api/movies/popular"],
    queryFn: getPopularMovies,
    enabled: !showResults,
  });

  const { data: popularTVShows, isLoading: isPopularTVLoading } = useQuery({
    queryKey: ["/api/tv/popular"],
    queryFn: getPopularTVShows,
    enabled: !showResults,
  });

  const isLoading = isMovieLoading || isTVLoading;
  const noResults = !isLoading && showResults &&
    (!movieResults || movieResults.length === 0) &&
    (!tvResults    || tvResults.length === 0);

  const resultsHeading = hasQuery
    ? `Results for "${debouncedQuery}"`
    : "Filtered results";

  return (
    <div className="container mx-auto pt-24 pb-12 px-4">
      {/* Header row: back + search bar + filters */}
      <div className="flex flex-col gap-4 mb-8">
        <div className="flex items-center gap-3 flex-wrap">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden flex-shrink-0"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>

          <form onSubmit={handleSearchSubmit} className="flex-1 min-w-[260px] max-w-md">
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                type="text"
                placeholder="Search movies, TV shows..."
                className="w-full pl-10 bg-background"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
            </div>
          </form>

          <HorizontalSearchFilters
            filters={filters}
            onFiltersChange={handleFiltersChange}
            mediaType="both"
          />
        </div>
      </div>

      {/* Results */}
      {showResults ? (
        <div>
          <h2 className="text-xl font-bold mb-6">{resultsHeading}</h2>

          {isLoading && (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {[...Array(12)].map((_, i) => (
                <LoadingSkeleton key={i} variant="movie-card" />
              ))}
            </div>
          )}

          {!isLoading && (
            <div className="space-y-8">
              {movieResults && movieResults.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-4">Movies</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {movieResults.slice(0, 18).map((movie: Movie) => (
                      <MovieCard key={movie.id} movie={movie} />
                    ))}
                  </div>
                </div>
              )}

              {tvResults && tvResults.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-4">TV Shows</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {tvResults.slice(0, 18).map((show: TVShow) => (
                      <MovieCard
                        key={show.id}
                        movie={{ ...show, title: show.name } as any}
                        mediaType="tv"
                      />
                    ))}
                  </div>
                </div>
              )}

              {noResults && (
                <div className="text-center py-12">
                  <p className="text-lg font-semibold mb-1">Nothing found</p>
                  <p className="text-muted-foreground text-sm">
                    Try a different search term or adjust the filters.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* Popular — shown only when no query and no filters */
        <div className="space-y-8">
          <div>
            <h2 className="text-2xl font-bold mb-6">Popular Movies</h2>
            {isPopularMoviesLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {[...Array(12)].map((_, i) => (
                  <LoadingSkeleton key={i} variant="movie-card" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {popularMovies?.slice(0, 12).map((movie: Movie) => (
                  <MovieCard key={movie.id} movie={movie} />
                ))}
              </div>
            )}
          </div>

          <div>
            <h2 className="text-2xl font-bold mb-6">Popular TV Shows</h2>
            {isPopularTVLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {[...Array(12)].map((_, i) => (
                  <LoadingSkeleton key={i} variant="movie-card" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {popularTVShows?.slice(0, 12).map((show: TVShow) => (
                  <MovieCard
                    key={show.id}
                    movie={{ ...show, title: show.name } as any}
                    mediaType="tv"
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Search;
