import React, { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Movie } from "@/types/movie";
import { TVShow } from "@/types/tvshow";
import { getMoviesByGenre, getTVShowsByGenre } from "@/lib/tmdb";
import MovieCard from "@/components/MovieCard";
import TVShowCard from "@/components/TVShowCard";
import { Skeleton } from "@/components/ui/skeleton";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Film, Tv, ChevronDown } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Genre = () => {
  const { mediaType, genre } = useParams();
  const [location] = useLocation();
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState("popularity.desc");
  const [allContent, setAllContent] = useState<(Movie | TVShow)[]>([]);
  const [hasNextPage, setHasNextPage] = useState(true);

  // Genre mappings for display and API
  const genreMap: { [key: string]: { id: number; name: string } } = {
    action: { id: 28, name: "Action" },
    adventure: { id: 12, name: "Adventure" },
    animation: { id: 16, name: "Animation" },
    comedy: { id: 35, name: "Comedy" },
    crime: { id: 80, name: "Crime" },
    documentary: { id: 99, name: "Documentary" },
    drama: { id: 18, name: "Drama" },
    family: { id: 10751, name: "Family" },
    fantasy: { id: 14, name: "Fantasy" },
    history: { id: 36, name: "History" },
    horror: { id: 27, name: "Horror" },
    music: { id: 10402, name: "Music" },
    mystery: { id: 9648, name: "Mystery" },
    romance: { id: 10749, name: "Romance" },
    scifi: { id: 878, name: "Science Fiction" },
    thriller: { id: 53, name: "Thriller" },
    war: { id: 10752, name: "War" },
    western: { id: 37, name: "Western" },
    anime: { id: 16, name: "Animation" }, // For TV shows, anime maps to animation
  };

  // TV-specific genre mappings
  const tvGenreMap: { [key: string]: { id: number; name: string } } = {
    action: { id: 10759, name: "Action & Adventure" },
    animation: { id: 16, name: "Animation" },
    comedy: { id: 35, name: "Comedy" },
    crime: { id: 80, name: "Crime" },
    documentary: { id: 99, name: "Documentary" },
    drama: { id: 18, name: "Drama" },
    family: { id: 10751, name: "Family" },
    kids: { id: 10762, name: "Kids" },
    mystery: { id: 9648, name: "Mystery" },
    news: { id: 10763, name: "News" },
    reality: { id: 10764, name: "Reality" },
    scifi: { id: 10765, name: "Sci-Fi & Fantasy" },
    soap: { id: 10766, name: "Soap" },
    talk: { id: 10767, name: "Talk" },
    war: { id: 10768, name: "War & Politics" },
    western: { id: 37, name: "Western" },
    anime: { id: 16, name: "Animation" },
  };

  const currentGenreMap = mediaType === "tv" ? tvGenreMap : genreMap;
  const currentGenre = currentGenreMap[genre || ""] || { id: 0, name: "Unknown" };

  // Determine if we're fetching movies or TV shows
  const isMovie = mediaType === "movie";
  const isTV = mediaType === "tv";  // Fetch content based on type
  const { data: content, isLoading, error } = useQuery<(Movie | TVShow)[]>({
    queryKey: [isMovie ? "/api/movies" : "/api/tv", "genre", currentGenre.id, currentPage, sortBy],
    queryFn: () => {
      if (isMovie) {
        return getMoviesByGenre(currentGenre.id, currentPage, sortBy);
      } else {
        return getTVShowsByGenre(currentGenre.id, currentPage, sortBy);
      }
    },
    enabled: currentGenre.id > 0,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Clear the previous category before applying cached or freshly fetched results.
  useEffect(() => {
    setCurrentPage(1);
    setAllContent([]);
    setHasNextPage(true);
  }, [sortBy, currentGenre.id]);

  // Update allContent when new content is fetched
  useEffect(() => {
    if (content) {
      if (currentPage === 1) {
        // Reset content for new sort or first load
        setAllContent(content);
      } else {
        // Append new content for pagination
        setAllContent(prev => {
          // Avoid duplicates by checking IDs
          const newContent = content.filter(item => !prev.some(existingItem => existingItem.id === item.id));
          return [...prev, ...newContent];
        });
      }
      
      // Check if we have more pages (TMDB typically returns 20 items per page)
      setHasNextPage(content.length === 20);
    }
  }, [content, currentPage]);

  const handleSortChange = (newSort: string) => {
    setSortBy(newSort);
  };

  const loadMore = () => {
    if (!isLoading && hasNextPage) {
      setCurrentPage(prev => prev + 1);
    }
  };

  if (currentGenre.id === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-500 mb-4">Genre Not Found</h1>
          <p className="text-muted-foreground">
            The genre "{genre}" is not available for {mediaType}.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-28 pt-24 md:pb-12">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-7 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            {isMovie ? (
              <Film className="h-6 w-6 shrink-0 text-red-500 sm:h-8 sm:w-8" />
            ) : (
              <Tv className="h-6 w-6 shrink-0 text-red-500 sm:h-8 sm:w-8" />
            )}
            <div>
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                {currentGenre.name} {isMovie ? "Movies" : "TV Shows"}
              </h1>
              <p className="text-sm text-muted-foreground">
                Discover the best {currentGenre.name.toLowerCase()} {isMovie ? "movies" : "TV shows"}
              </p>
            </div>
          </div>

          {/* Sort Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="flex h-10 items-center gap-2 rounded-full border-white/10 bg-white/[0.05] text-sm">
                Sort by: {sortBy === "popularity.desc" ? "Popular" : 
                         sortBy === "vote_average.desc" ? "Top Rated" :
                         sortBy === "release_date.desc" || sortBy === "first_air_date.desc" ? "Latest" : "Popular"}
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleSortChange("popularity.desc")}>
                Most Popular
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSortChange("vote_average.desc")}>
                Top Rated
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => handleSortChange(isMovie ? "release_date.desc" : "first_air_date.desc")}
              >
                Latest Releases
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {/* Content Grid */}
        {error ? (
          <div className="text-center py-12">
            <h3 className="text-lg font-semibold text-red-500 mb-2">Error loading content</h3>
            <p className="text-muted-foreground">
              Unable to load {currentGenre.name.toLowerCase()} {isMovie ? "movies" : "TV shows"}. Please try again later.
            </p>
          </div>
        ) : allContent.length > 0 ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
              {allContent.map((item) => (
                <div key={item.id}>
                  {isMovie ? (
                    <MovieCard movie={item as Movie} />
                  ) : (
                    <TVShowCard show={item as TVShow} />
                  )}
                </div>
              ))}
            </div>

            {/* Load More Button */}
            {hasNextPage && (
              <div className="text-center">
                <Button 
                  onClick={loadMore} 
                  disabled={isLoading}
                  className="px-8"
                >
                  {isLoading ? "Loading..." : "Load More"}
                </Button>
              </div>
            )}
          </>        ) : isLoading && currentPage === 1 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {[...Array(18)].map((_, i) => (
              <LoadingSkeleton key={i} variant={isMovie ? "movie-card" : "tv-card"} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <h3 className="text-lg font-semibold mb-2">No content found</h3>
            <p className="text-muted-foreground">
              No {currentGenre.name.toLowerCase()} {isMovie ? "movies" : "TV shows"} available at the moment.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Genre;
