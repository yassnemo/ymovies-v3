import React, { useCallback, useState } from "react";
import { useLocation } from "wouter";
import { TVShow } from "@/types/tvshow";
import { cn } from "@/lib/utils";
import { Play, Plus, Check, Heart, Tv } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { useToast } from "@/hooks/use-toast";

interface HorizontalTVShowCardProps {
  show: TVShow;
  className?: string;
  hideInfo?: boolean;
}

const HorizontalTVShowCard: React.FC<HorizontalTVShowCardProps> = ({ show, className, hideInfo = false }) => {
  const [isHovered, setIsHovered] = useState(false);
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
  
  // Use backdrop image for horizontal cards
  const backdropPath = show.backdrop_path
    ? `https://image.tmdb.org/t/p/w500${show.backdrop_path}`
    : show.poster_path 
      ? `https://image.tmdb.org/t/p/w342${show.poster_path}`
      : "https://via.placeholder.com/500x281?text=No+Image";
  
  // Flag to check if the show is in favorites
  const isShowFavorite = isFavorite(show.id);
  
  // Flag to check if the show is in watchlist
  const isShowInWatchlist = isInWatchlist(show.id);  const handleWatchlistToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    console.log('TV Show Watchlist button clicked:', show.name, show.id);
    
    if (!isAuthenticated) {
      console.log('User not authenticated for watchlist');
      toast({
        title: "Login Required",
        description: "Please log in to add shows to your list.",
        variant: "default",
      });
      return;
    }

    if (isShowInWatchlist) {
      console.log('Removing from watchlist:', show.id);
      removeFromWatchlist(show.id);
    } else {
      console.log('Adding to watchlist:', show.id);
      // Convert TVShow to format compatible with preferences
      const watchlistFormat = {
        ...show,
        title: show.name, // Map name to title for compatibility
      };
      addToWatchlist(watchlistFormat);
    }
  }, [isAuthenticated, isShowInWatchlist, addToWatchlist, removeFromWatchlist, show, toast]);
  
  // Handle favorite toggle
  const handleFavoriteToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    console.log('TV Show Favorite button clicked:', show.name, show.id);
    
    if (!isAuthenticated) {
      console.log('User not authenticated for favorites');
      toast({
        title: "Login Required",
        description: "Please log in to add shows to favorites.",
        variant: "default",
      });
      return;
    }

    if (isShowFavorite) {
      console.log('Removing from favorites:', show.id);
      removeFromFavorites(show.id);
    } else {
      console.log('Adding to favorites:', show.id);
      // Convert TVShow to format compatible with preferences
      const favoriteFormat = {
        ...show,
        title: show.name, // Map name to title for compatibility
      };
      addToFavorites(favoriteFormat);
    }
  }, [isAuthenticated, isShowFavorite, addToFavorites, removeFromFavorites, show, toast]);
  const handlePlay = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Add to watch history if authenticated
    if (isAuthenticated) {
      const historyFormat = {
        ...show,
        title: show.name, // Map name to title for compatibility
      };
      addToWatchHistory(historyFormat);
    }
    
    navigate(`/tv/${show.id}`);
  }, [navigate, show, isAuthenticated, addToWatchHistory]);  const handleCardClick = useCallback((e: React.MouseEvent) => {
    // Don't navigate if the click was on a button or interactive element
    const target = e.target as HTMLElement;
    
    // Check for button or any interactive element
    if (target.closest('button') || 
        target.closest('[role="button"]') || 
        target.tagName === 'BUTTON' ||
        target.closest('.action-button')) {
      console.log('Card click blocked - button was clicked', target);
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
    
    console.log('Card click - navigating to TV show:', show.id);
    navigate(`/tv/${show.id}`);
  }, [navigate, show.id]);

  return (
    <div 
      className={cn(
        "tv-card flex-shrink-0 relative group cursor-pointer overflow-visible w-72 md:w-80 lg:w-96 hover:z-30",
        className
      )}
      onClick={handleCardClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
  <div className={`relative overflow-visible rounded-md transition-all duration-300 ease-in-out ${isHovered ? 'transform scale-105 shadow-xl z-20' : 'shadow-md'}`}>
          {/* TV badge for media type */}
          <div className="absolute top-2 left-2 z-10">
            <div className="h-6 w-6 rounded-full bg-black/60 backdrop-blur-sm border border-white/10 grid place-items-center text-white/90">
              <Tv className="h-3.5 w-3.5" />
            </div>
          </div>
          {/* Always visible title at bottom that animates on hover */}
        {/** Prefer TMDB original_name when available for fidelity */}
        {(() => { const displayName = show.original_name || show.name; return (
        <div className={`absolute bottom-0 left-0 right-0 p-4 z-10 transition-all duration-700 ${isHovered ? 'opacity-0 transform translate-y-6' : 'opacity-100 transform translate-y-0'}`}>
          <div className="h-24 w-full absolute bottom-0 left-0 bg-gradient-to-t from-black/95 via-black/70 to-transparent"></div>
          <h3 className="text-section-title relative font-bold line-clamp-1 text-white drop-shadow-lg">{displayName}</h3>
          <div className="relative mt-1 overflow-hidden h-0.5">
            <div className={`bg-red-500 h-0.5 w-12 transform transition-all duration-700 ease-out ${isHovered ? 'translate-x-full' : 'translate-x-0'}`}></div>
          </div>
        </div>
        ); })()}
        <img 
          src={backdropPath} 
          alt={`${(show.original_name || show.name)} backdrop`} 
          className="w-full h-auto aspect-[16/8] rounded-md transition-all duration-300 ease-in-out object-cover"
          loading="lazy"
        />
        
        {!hideInfo && (
          <div className={`absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent flex flex-col justify-end p-3 transition-all duration-500 ease-in-out ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
            
            {/* Animated TV title with enhanced styling */}
            <div className="overflow-hidden">
              <h3 className="text-section-title font-bold text-white">{show.original_name || show.name}</h3>
              <div className={`bg-red-500 h-0.5 w-16 mt-1 transform transition-all duration-700 delay-100 ease-out ${isHovered ? 'translate-x-0 opacity-100' : 'translate-x-[-100%] opacity-0'}`}></div>
            </div>
            
            {/* TV show details */}
            <div className="flex items-center text-xs space-x-3 mt-2">
              {show.vote_average > 0 && (
                <span className="bg-red-600 text-white font-medium px-2 py-0.5 rounded-sm">
                  {Math.round(show.vote_average * 10)}% Match
                </span>
              )}
              {show.first_air_date && (
                <span className="text-gray-200">
                  {new Date(show.first_air_date).getFullYear()}
                </span>
              )}
              
              {show.number_of_seasons && (
                <span className="text-gray-300 border-l border-gray-500 pl-2 ml-1">
                  {show.number_of_seasons} {show.number_of_seasons === 1 ? 'Season' : 'Seasons'}
                </span>
              )}
            </div>
            
            {/* Overview text */}
            <div className="mt-2">
              <p className="text-xs text-gray-200 leading-relaxed line-clamp-2">{show.overview || "No overview available."}</p>
            </div>
              {/* Action Buttons */}
            <div className="flex items-center justify-between mt-3">
              <div className="flex space-x-3">
                <button 
                  className="p-2 bg-red-600 rounded-full hover:bg-red-700 text-white" 
                  onClick={handlePlay}
                  aria-label="Play trailer"
                >
                  <Play className="h-4 w-4" />
                </button>{/* Add to Watchlist button */}
                <button 
                  className={`p-1.5 rounded-full transition-all duration-200
                    ${isShowInWatchlist 
                      ? 'bg-red-600 hover:bg-red-700 text-white' 
                      : 'bg-gray-700 hover:bg-gray-600 text-white'}`}
                  onClick={handleWatchlistToggle}
                  aria-label={isShowInWatchlist ? "Remove from watchlist" : "Add to watchlist"}
                >
                  {isShowInWatchlist ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                </button>
                
                {/* Add to Favorites button */}
                <button 
                  className={`p-1.5 rounded-full transition-all duration-200
                    ${isShowFavorite 
                      ? 'bg-red-600 hover:bg-red-700 text-white' 
                      : 'bg-gray-700 hover:bg-gray-600 text-white'}`}
                  onClick={handleFavoriteToggle}
                  aria-label={isShowFavorite ? "Remove from favorites" : "Add to favorites"}
                >
                  <Heart className={`h-4 w-4 ${isShowFavorite ? 'fill-current' : ''}`} />
                </button>
              </div>

            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HorizontalTVShowCard;
