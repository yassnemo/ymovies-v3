import React, { useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Film, Tv } from "lucide-react";
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
  const source = sources[mediaType][filter];
  const { data = [], isLoading, isError, refetch } = useQuery<(Movie | TVShow)[]>({
    queryKey: [source.key],
    queryFn: () => source.fetch(),
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
  const label = mediaType === "movie" ? "Movies" : "TV shows";
  const Icon = mediaType === "movie" ? Film : Tv;

  return (
    <main className="min-h-screen pb-28 pt-24 md:pb-12">
      <div className="container mx-auto px-4">
        <h1 className="mb-6 flex items-center gap-3 text-page-title font-semibold tracking-tight">
          <Icon className="h-7 w-7 text-red-500" />{label}
        </h1>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <Tabs value={filter} onValueChange={value => setFilter(value as Filter)}>
            <TabsList aria-label={`Filter ${label.toLowerCase()}`}>
              <TabsTrigger value="trending">Trending</TabsTrigger>
              <TabsTrigger value="popular">Popular</TabsTrigger>
              <TabsTrigger value="top-rated">Top rated</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/search?type=${mediaType}`}>More filters</Link>
          </Button>
        </div>
        <div aria-live="polite" aria-busy={isLoading}>
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
