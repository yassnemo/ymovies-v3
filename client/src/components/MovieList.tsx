import React, { useState, useCallback } from "react";
import MovieCard from "./MovieCard";
import HorizontalMovieCard from "./HorizontalMovieCard";
import { Movie } from "@/types/movie";
import { Button } from "@/components/ui/button";
import { Grid, LayoutList, Play, Plus, Check, Info, Heart, Star } from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useUserPreferences } from "@/hooks/useUserPreferences";

interface MovieListProps {
  title: string;
  movies: Movie[];
  className?: string;
  defaultLayout?: "grid" | "list";
}

const MovieList = ({ title, movies, className, defaultLayout = "grid" }: MovieListProps) => {
  const [viewMode, setViewMode] = useState<"grid" | "list">(defaultLayout);
  const [, navigate] = useLocation();
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const { 
    isFavorite, 
    isInWatchlist, 
    addToFavorites, 
    removeFromFavorites, 
    addToWatchlist, 
    removeFromWatchlist,
    addToWatchHistory
  } = useUserPreferences();

  const handlePlay = useCallback((e: React.MouseEvent, movie: Movie) => {
    e.stopPropagation();
    
    if (isAuthenticated) {
      addToWatchHistory(movie);
    }
    
    navigate(`/movie/${movie.id}`);
  }, [isAuthenticated, addToWatchHistory, navigate]);

  const handleFavoriteToggle = useCallback((e: React.MouseEvent, movie: Movie) => {
    e.stopPropagation();
    
    if (!isAuthenticated) {
      toast({
        title: "Login Required",
        description: "Please log in to add movies to your favorites.",
        variant: "default",
      });
      return;
    }

    if (isFavorite(movie.id)) {
      removeFromFavorites(movie.id);
    } else {
      addToFavorites(movie);
    }
  }, [isAuthenticated, isFavorite, addToFavorites, removeFromFavorites, toast]);

  const handleWatchlistToggle = useCallback((e: React.MouseEvent, movie: Movie) => {
    e.stopPropagation();
    
    if (!isAuthenticated) {
      toast({
        title: "Login Required",
        description: "Please log in to add movies to your list.",
        variant: "default",
      });
      return;
    }

    if (isInWatchlist(movie.id)) {
      removeFromWatchlist(movie.id);
    } else {
      addToWatchlist(movie);
    }
  }, [isAuthenticated, isInWatchlist, addToWatchlist, removeFromWatchlist, toast]);

  return (
    <div className={className}>
      {/* Header with title and view controls */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg md:text-2xl font-bold text-foreground">{title}</h2>
        <div className="flex items-center space-x-2">
          <Button
            variant={viewMode === "grid" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("grid")}
            className="px-3 py-2"
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("list")}
            className="px-3 py-2"
          >
            <LayoutList className="h-4 w-4" />
          </Button>        </div>
      </div>

      {/* Movie Grid or List */}
      {viewMode === "grid" ? (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {movies.map((movie) => {
            const posterUrl = movie.poster_path 
              ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
              : "https://via.placeholder.com/500x750?text=No+Poster";
              
            const isMovieFavorite = isFavorite(movie.id);
            const isMovieInWatchlist = isInWatchlist(movie.id);

            return (              <div 
                key={movie.id} 
                className="group cursor-pointer relative"
                onClick={() => navigate(`/movie/${movie.id}`)}
              >
                {/* Movie Card - Now taller to fill the space previously used by title/date */}
                <div className="relative aspect-[2/3.2] w-full overflow-hidden rounded-lg shadow-lg group-hover:shadow-2xl transition-all duration-300">
                  <img 
                    src={posterUrl} 
                    alt={`${movie.title} poster`} 
                    className="w-full h-full object-cover transition-all duration-300 group-hover:scale-105"
                    loading="lazy"
                  />
                  
                  {/* Rating badge in top right */}
                  {movie.vote_average > 0 && (
                    <div className="absolute top-2 right-2 bg-black/70 text-white px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                      <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" /> {movie.vote_average.toFixed(1)}
                    </div>
                  )}
                </div>                
                {/* Hover Overlay - Covers the Card */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/60 to-black/20 flex flex-col justify-end p-3 transition-all duration-300 ease-in-out opacity-0 group-hover:opacity-100 rounded-lg z-10">
                  {/* Movie title */}
                  <h3 className="font-bold text-base line-clamp-2 text-white mb-2">{movie.title}</h3>
                  
                  {/* Movie details row */}
                  <div className="flex items-center text-xs space-x-2 mb-2 text-gray-200">
                    {movie.vote_average > 0 && (
                      <span className="bg-red-600 text-white px-2 py-1 rounded text-xs font-semibold">
                        {Math.round(movie.vote_average * 10)}% Match
                      </span>
                    )}
                    <span className="text-gray-300 text-xs">
                      {movie.release_date ? new Date(movie.release_date).getFullYear() : 'N/A'}
                    </span>
                    {movie.adult && (
                      <span className="border border-gray-400 px-1 py-0.5 text-xs rounded">18+</span>
                    )}
                  </div>
                  
                  {/* Movie overview */}
                  <p className="text-xs text-gray-300 line-clamp-2 mb-3 leading-relaxed">
                    {movie.overview || "No description available."}
                  </p>
                  
                  {/* Action buttons */}
                  <div className="flex items-center justify-between">
                    <div className="flex space-x-1">
                      {/* Play button */}
                      <button 
                        className="flex items-center space-x-1 bg-white text-black px-3 py-1.5 rounded-md font-semibold transform transition-all duration-200 hover:scale-105 hover:bg-gray-200" 
                        onClick={(e) => handlePlay(e, movie)}
                        aria-label="Play movie"
                      >
                        <Play className="h-3 w-3 fill-current" />
                        <span className="text-xs font-medium">Play</span>
                      </button>
                      
                      {/* Watchlist button */}
                      <button 
                        className={`p-1.5 rounded-full border transition-all duration-200 transform hover:scale-110
                          ${isMovieInWatchlist 
                            ? 'bg-white border-white hover:bg-gray-200 text-black' 
                            : 'bg-gray-800/80 border-gray-600 hover:bg-gray-700 text-white'}`}
                        onClick={(e) => handleWatchlistToggle(e, movie)}
                        aria-label={isMovieInWatchlist ? "Remove from watchlist" : "Add to watchlist"}
                      >
                        {isMovieInWatchlist ? (
                          <Check className="h-3 w-3" />
                        ) : (
                          <Plus className="h-3 w-3" />
                        )}
                      </button>
                      
                      {/* Favorites button */}
                      <button 
                        className={`p-1.5 rounded-full border transition-all duration-200 transform hover:scale-110
                          ${isMovieFavorite 
                            ? 'bg-white border-white hover:bg-gray-200 text-black' 
                            : 'bg-gray-800/80 border-gray-600 hover:bg-gray-700 text-white'}`}
                        onClick={(e) => handleFavoriteToggle(e, movie)}
                        aria-label={isMovieFavorite ? "Remove from favorites" : "Add to favorites"}
                      >
                        <Heart className={`h-3 w-3 ${isMovieFavorite ? 'fill-current' : ''}`} />
                      </button>
                    </div>
                    
                    {/* Info button */}
                    <button 
                      className="p-1.5 rounded-full border border-gray-600 bg-gray-800/80 transform transition-all duration-200 hover:scale-110 hover:bg-gray-700 text-white"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/movie/${movie.id}`);
                      }}
                      aria-label="More information"
                    >
                      <Info className="h-3 w-3" />
                    </button>
                  </div>
                </div>
                
                {/* Hover glow effect */}
                <div className="absolute -inset-1 bg-gradient-to-r from-red-600/20 via-red-500/20 to-red-600/20 blur-sm rounded-lg -z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col space-y-3">
          {movies.map((movie) => (
            <HorizontalMovieCard key={movie.id} movie={movie} />
          ))}
        </div>
      )}
    </div>
  );
};

export default MovieList;
