import React, { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Play, Plus, Check, Heart } from "lucide-react";
import TrailerPlayer from "@/components/TrailerPlayer";
import WatchProviders from "@/components/WatchProviders";

// Define interfaces for the movie details page
interface VideoType {
  id: string;
  key: string;
  name: string;
  site: string;
  type: string;
}

interface ReviewAuthorDetails {
  username: string;
  rating?: number;
  avatar_path?: string;
}

interface Review {
  id: string;
  author: string;
  content: string;
  created_at: string;
  url?: string;
  author_details: ReviewAuthorDetails;
}

interface CastMember {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
}

interface CrewMember {
  id: number;
  name: string;
  job: string;
  department: string;
}

interface Genre {
  id: number;
  name: string;
}
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import MovieCard from "@/components/MovieCard";
import { Movie } from "@/types/movie";
import { getMovieDetails, getMovieVideos, getMovieReviews } from "@/lib/tmdb";
import { getEnhancedSimilarMovies, getBecauseYouWatchedRecommendations } from "@/lib/recommendations";
import { useUserPreferences } from "@/hooks/useUserPreferences";

const MovieDetail = () => {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isFavorite, addToFavorites, removeFromFavorites } = useUserPreferences();
  
  const [recommendationCategory, setRecommendationCategory] = useState("More Like This");
  const movieId = parseInt(id || "0", 10);
  
  // Check if movie is in favorites - use a more reactive approach
  const favoriteStatus = useMemo(() => {
    return isAuthenticated && movieId > 0 ? isFavorite(movieId) : false;
  }, [isAuthenticated, movieId, isFavorite]);
  
  const handleFavoriteToggle = async () => {
    if (!isAuthenticated) {
      toast({
        title: "Login Required",
        description: "Please log in to add movies to your favorites.",
        variant: "default",
      });
      return;
    }
    
    if (!movie) {
      console.warn("Movie data not available for favorite toggle");
      return;
    }
    
    try {
      if (favoriteStatus) {
        await removeFromFavorites(movieId);
      } else {
        await addToFavorites(movie);
      }
    } catch (error) {
      console.error(`Error toggling favorite for movie ${movieId}:`, error);
      toast({
        title: "Error",
        description: "Failed to update favorites. Please try again.",
        variant: "destructive",
      });
    }
  };
  


  // Fetch movie details
  const { data: movie, isLoading: isMovieLoading, isError: isMovieError, error: movieError } = useQuery<Movie>({
    queryKey: [`movie-details-${movieId}`],
    queryFn: () => getMovieDetails(movieId),
    enabled: movieId > 0,
    retry: 3,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes (formerly cacheTime)
  });
  
  // Handle error using useEffect
  React.useEffect(() => {
    if (movieError) {
      console.error("Error fetching movie details:", movieError);
      toast({
        title: "Error loading movie details",
        description: "Please try refreshing the page",
        variant: "destructive",
      });
    }
  }, [movieError, toast]);
  
  // Fetch enhanced similar movies with better error handling
  const { data: similarMovies, isLoading: isSimilarMoviesLoading, error: similarMoviesError } = useQuery<Movie[]>({
    queryKey: [`movie-enhanced-similar-${movieId}`],
    queryFn: () => getEnhancedSimilarMovies(movieId),
    enabled: movieId > 0 && !!movie,
    retry: 2,
    staleTime: 1000 * 60 * 60 * 2, // 2 hours — matches server-side 6h cache; recs don't change often
    gcTime: 1000 * 60 * 60 * 6,   // 6 hours in memory
  });
  
  // Handle error using useEffect
  React.useEffect(() => {
    if (similarMoviesError) {
      console.error("Error fetching enhanced similar movies:", similarMoviesError);
    }
  }, [similarMoviesError]);

  React.useEffect(() => {
    if (movie) setRecommendationCategory(`More movies like ${movie.title}`);
  }, [movie]);
  
  // Fetch movie videos (trailers) with better error handling
  const { data: videos, isLoading: isVideosLoading, error: videosError } = useQuery<VideoType[]>({
    queryKey: [`movie-videos-${movieId}`],
    queryFn: () => getMovieVideos(movieId),
    enabled: movieId > 0 && !!movie,
    retry: 2,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes (formerly cacheTime)
  });
  
  // Handle error using useEffect
  React.useEffect(() => {
    if (videosError) {
      console.error("Error fetching movie videos:", videosError);
    }
  }, [videosError]);
  
  // Fetch movie reviews with better error handling
  const { data: reviews, isLoading: isReviewsLoading, error: reviewsError } = useQuery<Review[]>({
    queryKey: [`movie-reviews-${movieId}`],
    queryFn: () => getMovieReviews(movieId),
    enabled: movieId > 0 && !!movie,
    retry: 2,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes (formerly cacheTime)
  });
  
  // Handle error using useEffect
  React.useEffect(() => {
    if (reviewsError) {
      console.error("Error fetching movie reviews:", reviewsError);
    }
  }, [reviewsError]);
  
  const { isInWatchlist, addToWatchlist, removeFromWatchlist } = useUserPreferences();
  
  // Check if movie is in watchlist using the hook
  const isMovieInWatchlist = isAuthenticated && movie ? isInWatchlist(movie.id) : false;
  
  // Define the update progress mutation
  const updateProgress = useMutation({
    mutationFn: (progress: number) => {
      return apiRequest("PUT", `/api/watch-history/${movieId}/progress`, { 
        watchProgress: progress,
        movieId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/watch-history"] });
    },
    onError: (error: Error) => {
      console.error("Failed to update watch progress:", error);
    }
  });
  // Get backdrop URL
  const backdropUrl = useMemo(() => {
    if (movie?.backdrop_path) {
      return `https://image.tmdb.org/t/p/original${movie.backdrop_path}`;
    }
    return 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&h=600&q=80';
  }, [movie]);
  
  // Handle watchlist toggle - updated to use useUserPreferences hook
  const handleWatchlistToggle = () => {
    if (!isAuthenticated) {
      toast({
        title: "Login Required",
        description: "Please log in to add movies to your list.",
        variant: "default",
      });
      return;
    }
    
    if (!movie) return;
    
    if (isMovieInWatchlist) {
      removeFromWatchlist(movie.id);
    } else {
      addToWatchlist(movie);
    }
  };
  
  // Format runtime
  const formatRuntime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };
  
  const [showTrailerModal, setShowTrailerModal] = useState(false);

  const mainTrailer = useMemo(() => {
    if (!videos || !Array.isArray(videos)) return null;
    const official = videos.find(
      (v) => v?.site === "YouTube" && v?.type === "Trailer" && v?.name?.toLowerCase().includes("official")
    );
    if (official) return official;
    const anyTrailer = videos.find((v) => v?.site === "YouTube" && v?.type === "Trailer");
    if (anyTrailer) return anyTrailer;
    const teaser = videos.find((v) => v?.site === "YouTube" && v?.type === "Teaser");
    return teaser || videos.find((v) => v?.site === "YouTube") || null;
  }, [videos]);

  const startWatching = () => {
    if (mainTrailer) {
      if (isAuthenticated) updateProgress.mutate(0);
      setShowTrailerModal(true);
    } else {
      toast({
        title: "No Trailer Available",
        description: "Sorry, no trailer is available for this movie.",
        variant: "default",
      });
    }
  };
  
  // Update page title on movie load
  useEffect(() => {
    if (movie) {
      document.title = `${movie.title} - YMovies`;
    }
    
    return () => {
      document.title = "YMovies - Movie Recommendations";
    };
  }, [movie]);

  // No longer need to refresh watchlist status as useUserPreferences handles it

  if (isMovieLoading) {
    return (
      <div className="pb-12">
        {/* Hero Banner Skeleton */}
        <LoadingSkeleton variant="hero-banner" />
        
        {/* Movie Details Skeleton */}
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="md:w-2/3">
              <div className="flex items-center space-x-2 mb-4">
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-6 w-12" />
                <Skeleton className="h-6 w-8" />
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-6 w-8" />
              </div>
              
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-2/3 mb-6" />
              
              <div className="mb-6">
                <Skeleton className="h-6 w-16 mb-2" />
                <Skeleton className="h-4 w-full" />
              </div>
              
              <div className="mb-6">
                <Skeleton className="h-6 w-20 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            </div>
            
            <div className="md:w-1/3">
              <div className="mb-4">
                <Skeleton className="h-6 w-16 mb-2" />
                <Skeleton className="h-4 w-full" />
              </div>
              
              <div>
                <Skeleton className="h-6 w-24 mb-2" />
                <Skeleton className="h-4 w-full" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!movie) {
    return (
      <div className="container mx-auto pt-24 pb-12 px-4 text-center">
        <h2 className="text-2xl font-bold mb-4">Movie not found</h2>
        <p className="text-muted-foreground mb-6">The movie you're looking for doesn't exist or has been removed.</p>
        <Button onClick={() => navigate("/")}>Back to Home</Button>
      </div>
    );
  }

  return (
    <div className="pb-12">
      {/* Trailer Modal */}
      {showTrailerModal && mainTrailer && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4">
          <div className="w-full max-w-5xl">
            <TrailerPlayer
              videoKey={mainTrailer.key}
              title={mainTrailer.name}
              onClose={() => setShowTrailerModal(false)}
              inline
            />
          </div>
        </div>
      )}

      {/* Hero — backdrop with title + meta + actions pinned to bottom */}
      <div
        className="relative h-[50vh] md:h-[60vh] bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url('${backdropUrl}')`,
          backgroundPosition: 'center 20%',
          viewTransitionName: `movie-poster-${movieId}`,
        } as React.CSSProperties}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/55 to-black/10" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/30 to-transparent" />

        <div className="absolute bottom-0 left-0 right-0 px-6 pb-8">
          <div className="container mx-auto">
            <h1 className="text-3xl md:text-5xl font-bold text-white mb-2 drop-shadow-lg">
              {movie.title}
            </h1>

            <div className="flex items-center flex-wrap gap-2.5 mb-5 text-sm">
              <span className="text-green-400 font-bold">{Math.round(movie.vote_average * 10)}% Match</span>
              <span className="text-gray-300">{new Date(movie.release_date).getFullYear()}</span>
              <span className="border border-gray-500 px-1.5 py-0.5 text-xs text-gray-300 rounded">
                {movie.adult ? "R" : "PG-13"}
              </span>
              {movie.runtime && <span className="text-gray-300">{formatRuntime(movie.runtime)}</span>}
              <span className="border border-gray-500 px-1.5 py-0.5 text-xs text-gray-300 rounded">HD</span>
            </div>

            <div className="flex items-center gap-3">
              <Button className="bg-white text-black hover:bg-gray-200 font-semibold" onClick={startWatching}>
                <Play className="mr-2 h-4 w-4" />
                {mainTrailer ? "Play Trailer" : "Play"}
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={handleWatchlistToggle}
                title={isMovieInWatchlist ? "Remove from My List" : "Add to My List"}
              >
                {isMovieInWatchlist ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={handleFavoriteToggle}
                title={favoriteStatus ? "Remove from Favorites" : "Add to Favorites"}
                className={favoriteStatus ? "bg-red-600 border-red-600 hover:bg-red-700" : ""}
              >
                <Heart className={`h-4 w-4 ${favoriteStatus ? 'text-white fill-current' : ''}`} />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="container mx-auto px-4 py-8">

        {/* Overview + details grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* Left: overview + compact meta rows */}
          <div className="md:col-span-2 space-y-3">
            <p className="text-gray-300 leading-relaxed">{movie.overview}</p>

            {movie.credits?.cast && Array.isArray(movie.credits.cast) && (
              <div className="flex gap-2 text-sm">
                <span className="text-muted-foreground shrink-0">Cast:</span>
                <span className="text-foreground">
                  {movie.credits.cast.slice(0, 6).map((p: CastMember) => p.name).join(", ")}
                </span>
              </div>
            )}

            {movie.credits?.crew && Array.isArray(movie.credits.crew) && (
              <div className="flex gap-2 text-sm">
                <span className="text-muted-foreground shrink-0">Director:</span>
                <span className="text-foreground">
                  {movie.credits.crew
                    .filter((p: CrewMember) => p.job === "Director")
                    .map((p: CrewMember) => p.name)
                    .join(", ") || "Unknown"}
                </span>
              </div>
            )}

            {movie.genres && (
              <div className="flex gap-2 text-sm">
                <span className="text-muted-foreground shrink-0">Genres:</span>
                <span className="text-foreground">{movie.genres.map((g: Genre) => g.name).join(", ")}</span>
              </div>
            )}
          </div>

          {/* Right sidebar: quick facts */}
          <div className="space-y-4 text-sm border-l border-border pl-6 hidden md:block">
            {movie.vote_average > 0 && (
              <div>
                <p className="text-muted-foreground text-xs uppercase tracking-wide mb-0.5">Rating</p>
                <p className="font-semibold">{movie.vote_average.toFixed(1)} / 10</p>
              </div>
            )}
            {movie.release_date && (
              <div>
                <p className="text-muted-foreground text-xs uppercase tracking-wide mb-0.5">Released</p>
                <p>{new Date(movie.release_date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</p>
              </div>
            )}
            {movie.runtime && (
              <div>
                <p className="text-muted-foreground text-xs uppercase tracking-wide mb-0.5">Runtime</p>
                <p>{formatRuntime(movie.runtime)}</p>
              </div>
            )}
          </div>
        </div>

        {/* Trailer */}
        {mainTrailer && (
          <div className="mb-8">
            <h3 className="text-lg font-bold mb-4">Trailer</h3>
            <div className="max-w-2xl">
              <TrailerPlayer videoKey={mainTrailer.key} title={mainTrailer.name} />
            </div>
          </div>
        )}

        {/* Where to Watch */}
        <div className="mb-8">
          <WatchProviders mediaId={movieId} mediaType="movie" />
        </div>

        {/* Reviews */}
        {reviews && Array.isArray(reviews) && reviews.length > 0 && (
          <div className="mb-8">
            <h3 className="text-lg font-bold mb-4">Reviews</h3>
            <div className="space-y-3">
              {reviews.slice(0, 2).map((review) => (
                <div key={review.id} className="bg-card border border-border rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                      {review.author_details?.username?.charAt(0).toUpperCase() ?? "?"}
                    </div>
                    <div className="flex-1 flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm">{review.author}</span>
                      {review.author_details.rating && (
                        <span className="text-yellow-500 text-xs">★ {review.author_details.rating}/10</span>
                      )}
                      <span className="text-xs text-muted-foreground ml-auto">
                        {new Date(review.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-3">{review.content}</p>
                  {review.url && (
                    <button
                      onClick={() => window.open(review.url, '_blank', 'noopener,noreferrer')}
                      className="mt-1.5 text-xs font-medium text-primary hover:underline bg-transparent border-none p-0 cursor-pointer"
                    >
                      Read full review →
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommendations */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold">{recommendationCategory}</h3>
            {isAuthenticated && (
              <span className="text-xs text-muted-foreground bg-primary/10 px-3 py-1 rounded-full">
                AI-Powered
              </span>
            )}
          </div>

          {isSimilarMoviesLoading ? (
            <div className="relative">
              <div className="overflow-x-auto overflow-y-visible scrollbar-hide">
                <div className="flex gap-4 pb-4">
                  {[...Array(10)].map((_, i) => (
                    <div key={i} className="flex-shrink-0 w-56 overflow-visible">
                      <LoadingSkeleton variant="movie-card" />
                    </div>
                  ))}
                </div>
              </div>
              <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-background to-transparent" />
              <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-background to-transparent" />
            </div>
          ) : similarMovies && similarMovies.length > 0 ? (
            <div className="relative">
              <div className="overflow-x-auto overflow-y-visible scrollbar-hide">
                <div className="flex gap-4 pb-2">
                  {similarMovies.slice(0, 20).map((m) => (
                    <div key={m.id} className="flex-shrink-0 w-56 overflow-visible">
                      <MovieCard movie={m} />
                    </div>
                  ))}
                </div>
              </div>
              <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-background to-transparent" />
              <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-background to-transparent" />
            </div>
          ) : (
            <div className="py-6 text-center">
              <p className="text-sm text-muted-foreground">
                {similarMoviesError ? "Unable to load recommendations." : "No similar movies found."}
              </p>
              {!isAuthenticated && (
                <div className="mt-4 p-4 bg-primary/5 rounded-lg border border-primary/20 max-w-sm mx-auto">
                  <p className="text-sm font-medium mb-1">Get Better Recommendations</p>
                  <p className="text-xs text-muted-foreground mb-3">
                    Sign in for personalized AI-powered recommendations.
                  </p>
                  <Button size="sm" onClick={() => navigate("/signin")} className="text-xs">
                    Sign In
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MovieDetail;
