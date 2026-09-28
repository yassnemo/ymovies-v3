import React, { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import MovieDetailIntro, { MovieDetailIntroSkeleton } from "@/components/MovieDetailIntro";
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

  if (isMovieLoading) return <MovieDetailIntroSkeleton />;

  if (!movie) {
    return (
      <div className="container mx-auto pt-24 pb-12 px-4 text-center">
        <h2 className="text-section-title font-bold mb-4">Movie not found</h2>
        <p className="text-muted-foreground mb-6">The movie you're looking for doesn't exist or has been removed.</p>
        <Button onClick={() => navigate("/")}>Back to Home</Button>
      </div>
    );
  }

  return (
    <div className="pb-28 md:pb-12">
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

      <MovieDetailIntro key={movie.id} movie={movie} hasTrailer={Boolean(mainTrailer)}
        inWatchlist={isMovieInWatchlist} favorite={favoriteStatus} onTrailer={startWatching}
        onWatchlist={handleWatchlistToggle} onFavorite={handleFavoriteToggle} />

      {/* Main content */}
      <div className="catalog-container py-4">

        {movie.credits?.cast && movie.credits.cast.length > 0 && (
          <section aria-labelledby="movie-cast-title" className="mb-10">
            <h2 id="movie-cast-title" className="mb-4 text-section-title font-semibold">Cast</h2>
            <div className="flex gap-5 overflow-x-auto pb-3 pt-1 scrollbar-hide">
              {movie.credits.cast.slice(0, 12).map(person => (
                <div key={person.id} className="w-20 shrink-0 text-center md:w-24">
                  {person.profile_path ? <img src={`https://image.tmdb.org/t/p/w185${person.profile_path}`}
                    alt="" loading="lazy" width="96" height="96" className="mb-3 aspect-square w-full rounded-full object-cover" />
                    : <div aria-hidden="true" className="mb-3 grid aspect-square place-items-center rounded-full bg-white/[0.06] text-section-title text-gray-500">{person.name.charAt(0)}</div>}
                  <p className="text-card-title font-medium line-clamp-2">{person.name}</p>
                  <p className="mt-1 text-caption text-gray-500 line-clamp-2">{person.character}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Trailer */}
        {mainTrailer && (
          <div className="mb-8">
            <h3 className="text-section-title font-bold mb-4">Trailer</h3>
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
            <h3 className="text-section-title font-bold mb-4">Reviews</h3>
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
            <h3 className="text-section-title font-bold">{recommendationCategory}</h3>
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
                    <div key={i} className="media-card-slot overflow-visible">
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
                    <div key={m.id} className="media-card-slot overflow-visible">
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
