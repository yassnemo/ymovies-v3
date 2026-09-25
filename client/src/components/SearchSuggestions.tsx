import React, { useEffect, useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Film, Tv, Loader2 } from "lucide-react";
import { Movie } from "@/types/movie";
import { TVShow } from "@/types/tvshow";
import { searchMulti, MediaItem } from "@/lib/tmdb";

interface SearchSuggestionsProps {
  query: string;
  onItemClick: () => void;
}

const SearchSuggestions: React.FC<SearchSuggestionsProps> = ({ query, onItemClick }) => {
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    const normalizedQuery = query.trim().replace(/\s+/g, " ");
    const timeout = window.setTimeout(() => setDebouncedQuery(normalizedQuery), 300);
    return () => window.clearTimeout(timeout);
  }, [query]);

  // Fetch search results
  const { data: results, isLoading } = useQuery<MediaItem[]>({
    queryKey: ['/api/search/multi', debouncedQuery.toLocaleLowerCase()],
    queryFn: () => searchMulti(debouncedQuery),
    enabled: debouncedQuery.length >= 2,
    staleTime: 15 * 60 * 1000,
  });

  // Don't show anything if there's no query
  if (!query || query.length < 2) {
    return null;
  }

  return (
    <div className="absolute top-full left-0 right-0 md:right-0 md:left-auto mt-2 w-full md:w-96 lg:w-[480px] xl:w-[600px] z-50 bg-black/95 backdrop-blur-md border border-gray-700/50 rounded-lg shadow-2xl overflow-hidden">
      {isLoading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="w-5 h-5 text-muted-foreground animate-spin mr-2" />
          <span className="text-sm text-muted-foreground">Searching...</span>
        </div>
      ) : !results || results.length === 0 ? (
        <div className="p-6 text-center">
          <p className="text-sm text-muted-foreground mb-3">No results found for "{query}"</p>
          <Link 
            href={`/search?q=${encodeURIComponent(query)}`}
            className="text-sm text-primary hover:underline inline-flex items-center gap-1 px-3 py-1.5 bg-red-600/10 hover:bg-red-600/20 rounded-md transition-colors"
            onClick={onItemClick}
          >
            See all search results
          </Link>
        </div>
      ) : (        <>
          <div className="p-4 max-h-[70vh] overflow-y-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {results.slice(0, 8).map((item) => (
                <Link
                  key={`${item.media_type}-${item.id}`}
                  href={
                    item.media_type === "movie"
                      ? `/movie/${item.id}`
                      : `/tv/${item.id}`
                  }
                  className="flex items-start p-3 rounded-lg hover:bg-gray-800/70 transition-all duration-200 hover:scale-[1.02] border border-transparent hover:border-gray-700/50"
                  onClick={onItemClick}
                >
                  <div className="flex-shrink-0 w-14 h-20 bg-gray-800 rounded-md overflow-hidden mr-4 shadow-lg">
                    {item.poster_path ? (
                      <img
                        src={`https://image.tmdb.org/t/p/w154${item.poster_path}`}
                        alt={item.media_type === "movie" ? (item as Movie).title : (item as TVShow).name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-900">
                        {item.media_type === "movie" ? (
                          <Film className="w-7 h-7 text-gray-600" />
                        ) : (
                          <Tv className="w-7 h-7 text-gray-600" />
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-foreground truncate mb-1">
                      {item.media_type === "movie" 
                        ? (item as Movie).title 
                        : (item as TVShow).name}
                    </h4>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs text-muted-foreground">
                        {item.media_type === "movie" 
                          ? new Date((item as Movie).release_date).getFullYear() 
                          : new Date((item as TVShow).first_air_date).getFullYear()}
                      </span>
                      <span className="text-xs px-2 py-1 bg-gray-800/80 text-gray-300 rounded-full flex items-center gap-1">
                        {item.media_type === "movie" ? (
                          <Film className="w-3 h-3" />
                        ) : (
                          <Tv className="w-3 h-3" />
                        )}
                        {item.media_type === "movie" ? "Movie" : "TV"}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {item.overview}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
          <div className="border-t border-gray-800/50 p-4 bg-gray-900/30">
            <Link
              href={`/search?q=${encodeURIComponent(query)}`}
              className="text-sm flex justify-center items-center text-primary hover:text-red-400 transition-colors font-medium gap-2 py-2 px-4 rounded-lg hover:bg-red-600/10"
              onClick={onItemClick}
            >
              <span>See all results for "{query}"</span>
              <span className="text-xs bg-red-600/20 px-2 py-0.5 rounded-full">
                {results.length}+
              </span>
            </Link>
          </div>
        </>
      )}
    </div>
  );
};

export default SearchSuggestions;
