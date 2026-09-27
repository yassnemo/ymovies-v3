import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import MovieCard from "./MovieCard";
import { Movie } from "@/types/movie";

interface WatchHistoryItem {
  id: number;
  title?: string;
  name?: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date?: string;
  first_air_date?: string;
  vote_average: number;
  runtime?: number;
  watchData: {
    watchProgress: number;
    watchCount: number;
    completed: boolean;
    rating: number | null;
    lastStoppedAt: number;
    watchDuration: number;
    watchedAt: string | null;
  };
}

const ContinueWatching = () => {
  const { isAuthenticated } = useAuth();

  const { data: history, isLoading } = useQuery<WatchHistoryItem[]>({
    queryKey: ["continue-watching"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/history");
      return res.json();
    },
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 10,
  });

  const inProgress = React.useMemo(() => {
    if (!history) return [];
    return history
      .filter((item) => item.watchData.watchProgress > 0 && !item.watchData.completed)
      .sort((a, b) => {
        const dateA = a.watchData.watchedAt ? new Date(a.watchData.watchedAt).getTime() : 0;
        const dateB = b.watchData.watchedAt ? new Date(b.watchData.watchedAt).getTime() : 0;
        return dateB - dateA;
      })
      .slice(0, 20);
  }, [history]);

  if (!isAuthenticated || isLoading || inProgress.length === 0) return null;

  const formatTimeLeft = (progress: number, runtime?: number) => {
    if (!runtime) return `${progress}%`;
    const minutesLeft = Math.round(runtime * (1 - progress / 100));
    if (minutesLeft < 60) return `${minutesLeft}m left`;
    const h = Math.floor(minutesLeft / 60);
    const m = minutesLeft % 60;
    return `${h}h ${m}m left`;
  };

  return (
    <section className="mt-8 px-4 relative group/slider w-full">
      <div className="flex items-center mb-2">
        <h2 className="text-section-title font-bold ml-2 group-hover/slider:text-red-600 transition-colors duration-300">
          Continue Watching
        </h2>
        <div className="h-px flex-grow bg-gray-800 ml-4 opacity-0 group-hover/slider:opacity-100 transition-opacity duration-300" />
      </div>

      <div className="relative overflow-visible">
        <div
          className="flex overflow-x-auto gap-4 pb-6 pt-2 px-2 scrollbar-hide"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {inProgress.map((item) => {
            const title = item.title || item.name || "Untitled";
            const isTV = !!item.name;
            const cardMovie: Movie = {
              ...item, title, overview: "", release_date: item.release_date || item.first_air_date || "",
              vote_count: 0, adult: false, genre_ids: [], original_language: "",
              original_title: title, popularity: 0, video: false,
            };

            return (
              <div
                key={item.id}
                className="media-card-slot"
              >
                <MovieCard movie={cardMovie}
                  mediaType={isTV ? "tv" : "movie"} watchProgress={item.watchData.watchProgress} />
                <p className="mt-2 text-card-title font-medium line-clamp-1">{title}</p>
                <p className="mt-0.5 text-caption text-gray-400">{formatTimeLeft(item.watchData.watchProgress, item.runtime)}</p>
              </div>
            );
          })}
        </div>

        <div className="absolute top-0 left-0 bottom-0 w-12 bg-gradient-to-r from-background to-transparent z-0 pointer-events-none" />
        <div className="absolute top-0 right-0 bottom-0 w-12 bg-gradient-to-l from-background to-transparent z-0 pointer-events-none" />
      </div>
    </section>
  );
};

export default ContinueWatching;
