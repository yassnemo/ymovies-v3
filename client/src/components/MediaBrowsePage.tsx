import React, { useState } from "react";
import { Link } from "wouter";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ChevronDown, SlidersHorizontal } from "lucide-react";
import { GENRE_MAP } from "@/lib/genres";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoadingSkeleton } from "./LoadingSkeleton";
import MovieList from "./MovieList";
import TVShowList from "./TVShowList";
import { Movie } from "@/types/movie";
import { TVShow } from "@/types/tvshow";
import {
  getTrendingMovies, getPopularMovies, getTopRatedMovies,
  getTrendingTVShows, getPopularTVShows, getTopRatedTVShows,
  discoverMoviesWithFilters, discoverTVShowsWithFilters,
} from "@/lib/tmdb";

const sources = {
  movie: {
    trending: { key: "/api/trending/movie", fetch: getTrendingMovies },
    popular: { key: "/api/movie/popular", fetch: getPopularMovies },
    "top-rated": { key: "/api/movie/top-rated", fetch: getTopRatedMovies },
  },
  tv: {
    trending: { key: "/api/trending/tv", fetch: getTrendingTVShows },
    popular: { key: "/api/tv/popular", fetch: getPopularTVShows },
    "top-rated": { key: "/api/tv/top-rated", fetch: getTopRatedTVShows },
  },
};
type Filter = "trending" | "popular" | "top-rated";

export default function MediaBrowsePage({ mediaType }: { mediaType: "movie" | "tv" }) {
  const [filter, setFilter] = useState<Filter>("trending");
  const [genre, setGenre] = useState("");
  const [year, setYear] = useState("");
  const filtered = Boolean(genre || year);
  const source = sources[mediaType][filter];
  const { data = [], isLoading, isFetching, isError, refetch } = useQuery<(Movie | TVShow)[]>({
    queryKey: filtered ? ["browse", mediaType, filter, genre, year] : [source.key],
    queryFn: () => {
      if (!filtered) return source.fetch();
      const filters = { genre: genre ? Number(genre) : undefined, year: year ? Number(year) : undefined,
        sortBy: filter === "top-rated" ? "vote_average.desc" as const : "popularity.desc" as const };
      return mediaType === "movie" ? discoverMoviesWithFilters(filters) : discoverTVShowsWithFilters(filters);
    },
    placeholderData: keepPreviousData,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
  const label = mediaType === "movie" ? "Movies" : "TV shows";
  const genreIds = mediaType === "movie"
    ? [28, 12, 16, 35, 80, 99, 18, 10751, 14, 36, 27, 10402, 9648, 10749, 878, 53, 10752, 37]
    : [10759, 16, 35, 80, 99, 18, 10751, 10762, 9648, 10763, 10764, 10765, 10766, 10767, 10768, 37];
  const moreFilters = new URLSearchParams({ type: mediaType });
  if (genre) moreFilters.set("genre", genre);
  if (year) moreFilters.set("year", year);
  if (filtered) moreFilters.set("sortBy", filter === "top-rated" ? "vote_average.desc" : "popularity.desc");
  const selectClass = "h-11 appearance-none rounded-full border border-white/10 bg-white/[0.04] py-2 pl-4 pr-9 text-body text-gray-200 [color-scheme:dark] focus-visible:ring-red-500/60";
  const updateFilter = (value: Filter) => {
    setFilter(value);
    if (value === "trending") { setGenre(""); setYear(""); }
  };

  return (
    <main className="min-h-screen pb-28 pt-24 md:pb-12">
      <div className="catalog-container">
        <h1 className="mb-5 text-page-title font-semibold tracking-tight">{label}</h1>
        <div className="mb-6 flex flex-wrap items-center gap-2.5 border-b border-white/[0.06] pb-5">
          <Tabs value={filter} onValueChange={value => updateFilter(value as Filter)}>
            <TabsList aria-label={`Filter ${label.toLowerCase()}`} className="h-11 rounded-full bg-white/[0.06] p-1">
              <TabsTrigger value="trending" className="h-9 rounded-full px-3 data-[state=active]:bg-white data-[state=active]:text-black">Trending</TabsTrigger>
              <TabsTrigger value="popular" className="h-9 rounded-full px-3 data-[state=active]:bg-white data-[state=active]:text-black">Popular</TabsTrigger>
              <TabsTrigger value="top-rated" className="h-9 rounded-full px-3 data-[state=active]:bg-white data-[state=active]:text-black">Top rated</TabsTrigger>
            </TabsList>
          </Tabs>
          <label className="relative">
            <select aria-label="Filter by genre" value={genre} className={`${selectClass} max-w-[220px]`}
              onChange={event => { setGenre(event.target.value); if (filter === "trending") setFilter("popular"); }}>
              <option value="">All genres</option>
              {genreIds.map(id => <option key={id} value={id}>{GENRE_MAP[id]}</option>)}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-500" />
          </label>
          <label className="relative">
            <select aria-label="Filter by year" value={year} className={selectClass}
              onChange={event => { setYear(event.target.value); if (filter === "trending") setFilter("popular"); }}>
              <option value="">All years</option>
              {Array.from({ length: 40 }, (_, index) => new Date().getFullYear() - index).map(value => <option key={value} value={value}>{value}</option>)}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-500" />
          </label>
          {filtered && <button type="button" onClick={() => { setGenre(""); setYear(""); }} className="h-11 rounded-full px-3 text-body text-gray-400 hover:text-white">Clear</button>}
          <Button variant="ghost" className="h-11 rounded-full px-4 text-gray-400 hover:bg-white/[0.06] hover:text-white lg:ml-auto" asChild>
            <Link href={`/search?${moreFilters}`}><SlidersHorizontal className="mr-1.5 h-4 w-4" />More filters</Link>
          </Button>
        </div>
        <div aria-live="polite" aria-busy={isFetching} className={`transition-opacity duration-200 motion-reduce:transition-none ${isFetching && !isLoading ? "opacity-60" : "opacity-100"}`}>
          {isLoading ? (
            <div className="media-grid">
              {Array.from({ length: 18 }, (_, index) => <LoadingSkeleton key={index} variant="movie-card" />)}
            </div>
          ) : isError ? (
            <div className="py-12 text-center">
              <p className="mb-4 text-body text-muted-foreground">Unable to load {label.toLowerCase()} right now.</p>
              <Button onClick={() => refetch()}>Try again</Button>
            </div>
          ) : data.length === 0 ? (
            <p className="py-12 text-center text-body text-muted-foreground">No {label.toLowerCase()} found.</p>
          ) : mediaType === "movie" ? (
            <MovieList title="" movies={data as Movie[]} />
          ) : (
            <TVShowList title="" shows={data as TVShow[]} />
          )}
        </div>
      </div>
    </main>
  );
}
