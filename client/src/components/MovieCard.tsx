import React, { useCallback, useState, useRef, useEffect } from "react";
import { Movie } from "@/types/movie";
import { TVShow } from "@/types/tvshow";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { Play, Plus, Check, Film, Tv, Heart, Star } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getGenreNames } from "@/lib/genres";

interface MovieCardProps {
  movie: Movie | (TVShow & { title: string });
  hideInfo?: boolean;
  mediaType?: 'movie' | 'tv';
  watchProgress?: number;
}

const MovieCard = ({ movie, hideInfo = false, mediaType, watchProgress }: MovieCardProps) => {
  const isTV = 'name' in movie || mediaType === 'tv';
  const [isHovered, setIsHovered] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [heartBurst, setHeartBurst] = useState(false);
  const [bookmarkBounce, setBookmarkBounce] = useState(false);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
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

  const posterUrl = movie.poster_path
    ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
    : "https://via.placeholder.com/500x750?text=No+Poster";

  const isMovieFavorite = isFavorite(movie.id);
  const isMovieInWatchlist = isInWatchlist(movie.id);
  const genreNames = getGenreNames(movie.genre_ids || [], 3);

  const displayTitle = isTV && 'name' in movie ? (movie as TVShow).name : movie.title;

  const releaseYear = isTV
    ? ('first_air_date' in movie && movie.first_air_date ? new Date(movie.first_air_date).getFullYear() : null)
    : ('release_date' in movie && movie.release_date ? new Date(movie.release_date).getFullYear() : null);

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
    hoverTimer.current = setTimeout(() => setShowPreview(true), 350);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    setShowPreview(false);
    if (hoverTimer.current) {
      clearTimeout(hoverTimer.current);
      hoverTimer.current = null;
    }
  }, []);

  useEffect(() => {
    return () => { if (hoverTimer.current) clearTimeout(hoverTimer.current); };
  }, []);

  const handleWatchlistToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      toast({ title: "Login Required", description: "Please log in to add movies to your list." });
      return;
    }
    if (isMovieInWatchlist) {
      removeFromWatchlist(movie.id);
    } else {
      setBookmarkBounce(true);
      setTimeout(() => setBookmarkBounce(false), 500);
      addToWatchlist(movie);
    }
  }, [isAuthenticated, isMovieInWatchlist, addToWatchlist, removeFromWatchlist, movie, toast]);

  const handleFavoriteToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      toast({ title: "Login Required", description: "Please log in to add movies to favorites." });
      return;
    }
    if (isMovieFavorite) {
      removeFromFavorites(movie.id);
    } else {
      setHeartBurst(true);
      setTimeout(() => setHeartBurst(false), 700);
      addToFavorites(movie);
    }
  }, [isAuthenticated, isMovieFavorite, addToFavorites, removeFromFavorites, movie, toast]);

  const handlePlay = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (isAuthenticated) addToWatchHistory(movie);
    if (isTV) navigate(`/tv/${movie.id}`);
    else navigate(`/movie/${movie.id}`);
  }, [navigate, movie, isTV, isAuthenticated, addToWatchHistory]);

  const handleCardClick = useCallback(() => {
    if ('startViewTransition' in document) {
      (document as any).startViewTransition(() => {
        isTV ? navigate(`/tv/${movie.id}`) : navigate(`/movie/${movie.id}`);
      });
    } else {
      isTV ? navigate(`/tv/${movie.id}`) : navigate(`/movie/${movie.id}`);
    }
  }, [navigate, movie, isTV]);

  return (
    <div
      className="movie-card relative cursor-pointer w-full"
      style={{ zIndex: isHovered ? 30 : 1 }}
      onClick={handleCardClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Card — scale + overflow hidden keeps everything self-contained */}
      <motion.div
        className="relative rounded-xl overflow-hidden will-change-transform"
        animate={{ scale: showPreview ? 1.04 : 1 }}
        transition={{ type: "spring", stiffness: 320, damping: 28 }}
        style={{
          boxShadow: showPreview
            ? '0 20px 50px rgba(0,0,0,0.75), 0 0 0 1.5px rgba(255,255,255,0.12)'
            : isHovered
              ? '0 8px 24px rgba(0,0,0,0.4)'
              : '0 2px 8px rgba(0,0,0,0.25)',
        }}
      >
        {/* Poster image */}
        <div className="aspect-[2/3] w-full bg-zinc-800">
          <img
            src={posterUrl}
            alt={displayTitle}
            className="w-full h-full object-cover"
            loading="lazy"
            style={{ viewTransitionName: `movie-poster-${movie.id}` } as React.CSSProperties}
          />
        </div>

        {/* Media type badge — top left */}
        <div className="absolute top-2 left-2">
          <div className="h-6 w-6 rounded-full bg-black/60 backdrop-blur-sm border border-white/10 grid place-items-center text-white/90">
            {isTV ? <Tv className="h-3 w-3" /> : <Film className="h-3 w-3" />}
          </div>
        </div>

        {/* Rating badge — top right, hidden during preview */}
        {!showPreview && movie.vote_average > 0 && (
          <div className="absolute top-2 right-2 bg-black/70 text-white px-2 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1">
            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
            {movie.vote_average.toFixed(1)}
          </div>
        )}

        {/* Watch progress bar */}
        {typeof watchProgress === "number" && watchProgress > 0 && watchProgress < 100 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-800">
            <div className="bg-red-600 h-full" style={{ width: `${watchProgress}%` }} />
          </div>
        )}

        {/* Hover overlay — fades in over the bottom half of the poster */}
        {!hideInfo && (
          <AnimatePresence>
            {showPreview && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.22 }}
                className="absolute inset-0 flex flex-col justify-end"
                style={{
                  background: 'linear-gradient(to top, rgba(0,0,0,0.97) 0%, rgba(0,0,0,0.88) 35%, rgba(0,0,0,0.4) 62%, transparent 100%)',
                }}
              >
                <div className="px-3 pb-3 pt-0">
                  {/* Title */}
                  <p className="text-white font-semibold text-sm leading-snug line-clamp-2 mb-1.5">
                    {displayTitle}
                  </p>

                  {/* Metadata row */}
                  <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                    {movie.vote_average > 0 && (
                      <span className="text-green-400 font-bold text-xs">
                        {Math.round(movie.vote_average * 10)}%
                      </span>
                    )}
                    {releaseYear && (
                      <span className="text-gray-300 text-xs">{releaseYear}</span>
                    )}
                    <span className="border border-gray-500 text-gray-400 px-1 text-[10px] rounded leading-4">HD</span>
                  </div>

                  {/* Genre tags */}
                  {genreNames.length > 0 && (
                    <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 mb-3">
                      {genreNames.map((genre, i) => (
                        <React.Fragment key={genre}>
                          <span className="text-[11px] text-gray-300">{genre}</span>
                          {i < genreNames.length - 1 && (
                            <span className="text-gray-600 text-[11px]">•</span>
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex items-center gap-2">
                    {/* Play — wide labeled button */}
                    <button
                      className="flex-1 flex items-center justify-center gap-1.5 h-8 rounded-full bg-white text-black text-xs font-bold hover:bg-gray-100 active:scale-95 transition-all"
                      onClick={handlePlay}
                      aria-label="Play"
                    >
                      <Play className="h-3.5 w-3.5 fill-current" />
                      Play
                    </button>

                    {/* Watchlist */}
                    <button
                      className={`relative grid place-items-center h-8 w-8 rounded-full border-2 transition-all duration-150 hover:scale-110 active:scale-95
                        ${isMovieInWatchlist
                          ? 'bg-white border-white text-black'
                          : 'bg-black/30 border-gray-400 hover:border-white text-white'}
                        ${bookmarkBounce ? 'animate-bookmark-bounce' : ''}`}
                      onClick={handleWatchlistToggle}
                      aria-label={isMovieInWatchlist ? "Remove from watchlist" : "Add to watchlist"}
                    >
                      {isMovieInWatchlist ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                    </button>

                    {/* Favorites */}
                    <button
                      className={`relative grid place-items-center h-8 w-8 rounded-full border-2 transition-all duration-150 hover:scale-110 active:scale-95
                        ${isMovieFavorite
                          ? 'bg-white border-white text-black'
                          : 'bg-black/30 border-gray-400 hover:border-white text-white'}
                        ${heartBurst ? 'animate-heart-pop' : ''}`}
                      onClick={handleFavoriteToggle}
                      aria-label={isMovieFavorite ? "Remove from favorites" : "Add to favorites"}
                      style={{ overflow: 'visible' }}
                    >
                      <Heart className={`h-3.5 w-3.5 ${isMovieFavorite ? 'fill-current' : ''}`} />
                      {heartBurst && (
                        <span className="absolute inset-0 pointer-events-none" style={{ overflow: 'visible' }}>
                          {[
                            { x: -8, y: -10, bg: '#ef4444', delay: 0 },
                            { x: 8, y: -8, bg: '#f97316', delay: 40 },
                            { x: -6, y: 8, bg: '#ec4899', delay: 80 },
                            { x: 10, y: 6, bg: '#ef4444', delay: 120 },
                            { x: -12, y: 0, bg: '#f97316', delay: 60 },
                            { x: 12, y: -4, bg: '#ec4899', delay: 100 },
                          ].map((p, i) => (
                            <span
                              key={i}
                              className="absolute left-1/2 top-1/2 w-1 h-1 rounded-full animate-burst-particle"
                              style={{
                                backgroundColor: p.bg,
                                '--burst-x': `${p.x}px`,
                                '--burst-y': `${p.y}px`,
                                animationDelay: `${p.delay}ms`,
                              } as React.CSSProperties}
                            />
                          ))}
                        </span>
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </motion.div>
    </div>
  );
};

export default MovieCard;
