import React, { useCallback, useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { TVShow } from "@/types/tvshow";
import { cn } from "@/lib/utils";
import { Play, Plus, Check, Heart, Tv, Star } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { getGenreNames } from "@/lib/genres";

interface TVShowCardProps {
  show: TVShow;
  hideInfo?: boolean;
  className?: string;
}

const TVShowCard = ({ show, hideInfo = false, className }: TVShowCardProps) => {
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

  const imagePath = show.poster_path
    ? `https://image.tmdb.org/t/p/w500${show.poster_path}`
    : show.backdrop_path
      ? `https://image.tmdb.org/t/p/w500${show.backdrop_path}`
      : "https://via.placeholder.com/500x750?text=No+Image";

  const isShowFavorite = isFavorite(show.id);
  const isShowInWatchlist = isInWatchlist(show.id);
  const genreNames = getGenreNames(show.genre_ids || [], 3);
  const displayName = show.name || show.original_name;
  const releaseYear = show.first_air_date ? new Date(show.first_air_date).getFullYear() : null;

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
    e.preventDefault();
    if (!isAuthenticated) {
      toast({ title: "Login Required", description: "Please log in to add shows to your list." });
      return;
    }
    if (isShowInWatchlist) {
      removeFromWatchlist(show.id);
    } else {
      setBookmarkBounce(true);
      setTimeout(() => setBookmarkBounce(false), 500);
      addToWatchlist({ ...show, title: show.name });
    }
  }, [isAuthenticated, isShowInWatchlist, addToWatchlist, removeFromWatchlist, show, toast]);

  const handleFavoriteToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!isAuthenticated) {
      toast({ title: "Login Required", description: "Please log in to add shows to favorites." });
      return;
    }
    if (isShowFavorite) {
      removeFromFavorites(show.id);
    } else {
      setHeartBurst(true);
      setTimeout(() => setHeartBurst(false), 700);
      addToFavorites({ ...show, title: show.name });
    }
  }, [isAuthenticated, isShowFavorite, addToFavorites, removeFromFavorites, show, toast]);

  const handlePlay = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (isAuthenticated) addToWatchHistory({ ...show, title: show.name });
    navigate(`/tv/${show.id}`);
  }, [navigate, show, isAuthenticated, addToWatchHistory]);

  const handleCardClick = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    if ('startViewTransition' in document) {
      (document as any).startViewTransition(() => navigate(`/tv/${show.id}`));
    } else {
      navigate(`/tv/${show.id}`);
    }
  }, [navigate, show.id]);

  return (
    <div
      className={cn("movie-card relative cursor-pointer w-full", className)}
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
            src={imagePath}
            alt={displayName}
            className="w-full h-full object-cover"
            loading="lazy"
            style={{ viewTransitionName: `tv-poster-${show.id}` } as React.CSSProperties}
          />
        </div>

        {/* TV badge — top left */}
        <div className="absolute top-2 left-2">
          <div className="h-6 w-6 rounded-full bg-black/60 backdrop-blur-sm border border-white/10 grid place-items-center text-white/90">
            <Tv className="h-3 w-3" />
          </div>
        </div>

        {/* Rating badge — top right, hidden during preview */}
        {!showPreview && show.vote_average > 0 && (
          <div className="absolute top-2 right-2 bg-black/70 text-white px-2 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1">
            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
            {show.vote_average.toFixed(1)}
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
                    {displayName}
                  </p>

                  {/* Metadata row */}
                  <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                    {show.vote_average > 0 && (
                      <span className="text-green-400 font-bold text-xs">
                        {Math.round(show.vote_average * 10)}%
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
                        ${isShowInWatchlist
                          ? 'bg-white border-white text-black'
                          : 'bg-black/30 border-gray-400 hover:border-white text-white'}
                        ${bookmarkBounce ? 'animate-bookmark-bounce' : ''}`}
                      onClick={handleWatchlistToggle}
                      aria-label={isShowInWatchlist ? 'Remove from watchlist' : 'Add to watchlist'}
                    >
                      {isShowInWatchlist ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                    </button>

                    {/* Favorites */}
                    <button
                      className={`relative grid place-items-center h-8 w-8 rounded-full border-2 transition-all duration-150 hover:scale-110 active:scale-95
                        ${isShowFavorite
                          ? 'bg-white border-white text-black'
                          : 'bg-black/30 border-gray-400 hover:border-white text-white'}
                        ${heartBurst ? 'animate-heart-pop' : ''}`}
                      onClick={handleFavoriteToggle}
                      aria-label={isShowFavorite ? 'Remove from favorites' : 'Add to favorites'}
                      style={{ overflow: 'visible' }}
                    >
                      <Heart className={`h-3.5 w-3.5 ${isShowFavorite ? 'fill-current' : ''}`} />
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

export default TVShowCard;
