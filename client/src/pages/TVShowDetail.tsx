import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Play, Plus, Check, ArrowLeft, Heart, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import TrailerPlayer from "@/components/TrailerPlayer";
import WatchProviders from "@/components/WatchProviders";
import EpisodeTracker from "@/components/EpisodeTracker";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MovieCard from "@/components/MovieCard";
import TVShowCard from "@/components/TVShowCard";
import { TVShow } from "@/types/tvshow";
import { getTVShowDetails, getTVShowVideos, getTVShowReviews, getTVShowSeasonDetails } from "@/lib/tmdb";
import { getEnhancedSimilarTV } from "@/lib/recommendations";
import { useUserPreferences } from "@/hooks/useUserPreferences";

// Define interfaces for the TV show details page
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

const TVShowDetail = () => {
  const { id } = useParams();
  const [_, navigate] = useLocation();
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [selectedSeason, setSelectedSeason] = useState(1);const { 
    isFavorite, 
    addToFavorites, 
    removeFromFavorites,
    isInWatchlist: checkIsInWatchlist,
    addToWatchlist: addToUserWatchlist,
    removeFromWatchlist: removeFromUserWatchlist
  } = useUserPreferences();
  
  const tvShowId = id ? parseInt(id) : 0;
  const [showTrailerModal, setShowTrailerModal] = useState(false);
  
  // Check if TV show is in favorites - reactive approach
  const favoriteStatus = useMemo(() => {
    return isAuthenticated && tvShowId > 0 ? isFavorite(tvShowId) : false;
  }, [isAuthenticated, tvShowId, isFavorite]);
  
  // Check if TV show is in watchlist - reactive approach
  const watchlistStatus = useMemo(() => {
    return isAuthenticated && tvShowId > 0 ? checkIsInWatchlist(tvShowId) : false;
  }, [isAuthenticated, tvShowId, checkIsInWatchlist]);
    // Handle favorite toggle
  const handleFavoriteToggle = async () => {
    if (!isAuthenticated) {
      toast({
        title: "Login Required",
        description: "Please log in to add shows to your favorites.",
        variant: "default",
      });
      return;
    }
    
    if (!tvShow) {
      console.warn("TV show data not available for favorite toggle");
      return;
    }
    
    try {
      if (favoriteStatus) {
        await removeFromFavorites(tvShowId);
      } else {
        const movieFormat = {
          ...tvShow,
          title: tvShow.name,
        };
        await addToFavorites(movieFormat);
      }
    } catch (error) {
      console.error(`Error toggling favorite for TV show ${tvShowId}:`, error);
      toast({
        title: "Error",
        description: "Failed to update favorites. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  // Handle watchlist toggle
  const handleWatchlistToggle = async () => {
    if (!isAuthenticated) {
      toast({
        title: "Login Required",
        description: "Please log in to add shows to your watchlist.",
        variant: "default",
      });
      return;
    }
    
    if (!tvShow) {
      console.warn("TV show data not available for watchlist toggle");
      return;
    }
    
    try {
      if (watchlistStatus) {
        await removeFromUserWatchlist(tvShowId);
      } else {
        const watchlistFormat = {
          ...tvShow,
          title: tvShow.name,
        };
        await addToUserWatchlist(watchlistFormat);
      }
    } catch (error) {
      console.error(`Error toggling watchlist for TV show ${tvShowId}:`, error);
      toast({
        title: "Error",
        description: "Failed to update watchlist. Please try again.",
        variant: "destructive",
      });
    }
  };
    // Fetch TV show details
  const { data: tvShow, isLoading, isError } = useQuery<TVShow>({
    queryKey: [`/api/tv/${tvShowId}`],
    queryFn: () => getTVShowDetails(tvShowId),
    retry: 1,
    enabled: tvShowId > 0, // Only run the query if we have a valid ID
  });
    // Fetch videos (trailers, teasers, etc)
  const { data: videos, isLoading: isVideosLoading, error: videosError } = useQuery<VideoType[]>({
    queryKey: [`/api/tv/${tvShowId}/videos`],
    queryFn: () => getTVShowVideos(tvShowId),
    retry: 1,
    enabled: tvShowId > 0,
  });
  
  React.useEffect(() => {
    if (videosError) {
      console.error("Error fetching TV show videos:", videosError);
    }
  }, [videosError]);
  
  // Fetch reviews
  const { data: reviews, isLoading: isReviewsLoading, error: reviewsError } = useQuery<Review[]>({
    queryKey: [`/api/tv/${tvShowId}/reviews`],
    queryFn: () => getTVShowReviews(tvShowId),
    retry: 1,
    enabled: tvShowId > 0,
  });
  
  React.useEffect(() => {
    if (reviewsError) {
      console.error("Error fetching TV show reviews:", reviewsError);
    }
  }, [reviewsError]);
  
  // Fetch episodes for selected season
  const { data: seasonDetails } = useQuery({
    queryKey: [`/api/tv/${tvShowId}/season/${selectedSeason}`],
    queryFn: () => getTVShowSeasonDetails(tvShowId, selectedSeason),
    retry: 1,
    enabled: tvShowId > 0 && selectedSeason > 0,
  });
    // Find trailer
  const trailer = useMemo(() => {
    if (!videos || videos.length === 0) return null;
    const officialTrailer = videos.find(
      (video) => video.site === "YouTube" && video.type === "Trailer" && video.name.toLowerCase().includes("official")
    );
    if (officialTrailer) return officialTrailer;
    const anyTrailer = videos.find((video) => video.site === "YouTube" && video.type === "Trailer");
    if (anyTrailer) return anyTrailer;
    const teaser = videos.find((video) => video.site === "YouTube" && video.type === "Teaser");
    if (teaser) return teaser;
    return videos.find((video) => video.site === "YouTube") || null;
  }, [videos]);
  
  // Prefer enhanced server-side similar, fall back to TMDB embedded list
  const { data: enhancedSimilarData } = useQuery({
    queryKey: [`tv-enhanced-similar-${tvShowId}`],
    queryFn: () => getEnhancedSimilarTV(tvShowId),
    enabled: tvShowId > 0,
    staleTime: 1000 * 60 * 60 * 2, // 2 hours
    gcTime: 1000 * 60 * 60 * 6,    // 6 hours
  });
  const enhancedSimilar = enhancedSimilarData ?? null;

  const formatDate = (dateString: string) => {
    if (!dateString) return "Unknown";
    
    const options: Intl.DateTimeFormatOptions = { 
      year: "numeric", 
      month: "long", 
      day: "numeric" 
    };
    
    return new Date(dateString).toLocaleDateString(undefined, options);
  };
  
  // Format runtime function
  const formatSeasons = (seasons: number) => {
    return `${seasons} ${seasons === 1 ? 'Season' : 'Seasons'}`;
  };
    // Show loading state
  if (isLoading) {
    return (
      <div className="pb-12">
        {/* Hero Banner Skeleton */}
        <LoadingSkeleton variant="hero-banner" />
        
        {/* TV Show Details Skeleton */}
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
          
          {/* Tabs Skeleton */}
          <div className="mt-8">
            <div className="flex space-x-4 mb-6">
              <Skeleton className="h-10 w-20" />
              <Skeleton className="h-10 w-20" />
              <Skeleton className="h-10 w-20" />
            </div>
            
            {/* Content area skeleton */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {[...Array(10)].map((_, i) => (
                <LoadingSkeleton key={i} variant="movie-card" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }
    // Show error state
  if (isError || !tvShow || !tvShowId) {
    return (
      <div className="pt-20 pb-12 px-4 text-center">
        <h2 className="text-2xl font-bold mb-4">TV Show Not Found</h2>
        <p className="text-muted-foreground mb-6">
          {!tvShowId 
            ? "Invalid TV show ID provided." 
            : "We couldn't find the TV show you're looking for."}
        </p>
        <Button onClick={() => navigate("/")}>Back to Home</Button>
      </div>
    );
  }
  
  const similarShows = (enhancedSimilar && enhancedSimilar.length > 0)
    ? enhancedSimilar.slice(0, 12)
    : (tvShow.similar?.results.slice(0, 12) || []);
  
  // Get recommended TV shows
  const recommendedShows = tvShow.recommendations?.results.slice(0, 12) || [];
  
  // Get the backdrop path
  const backdropPath = tvShow.backdrop_path 
    ? `https://image.tmdb.org/t/p/original${tvShow.backdrop_path}`
    : null;
  
  // Get the poster path
  const posterPath = tvShow.poster_path
    ? `https://image.tmdb.org/t/p/w500${tvShow.poster_path}`
    : "https://via.placeholder.com/342x513?text=No+Poster";
    
  return (
    <div>
      {/* Trailer Modal */}
      {showTrailerModal && trailer && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4">
          <div className="w-full max-w-5xl">
            <TrailerPlayer
              videoKey={trailer.key}
              title={trailer.name}
              onClose={() => setShowTrailerModal(false)}
              inline
            />
          </div>
        </div>
      )}

      {/* Hero backdrop */}
      {backdropPath && (
        <div className="relative h-[90vh] w-full">
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{ 
              backgroundImage: `url(${backdropPath})`,
              backgroundPosition: "center 20%",
              viewTransitionName: `tv-poster-${tvShowId}`,
            } as React.CSSProperties}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/95 to-background/30" />
          <div className="absolute inset-0 bg-gradient-to-r from-background to-transparent" />
  
          
          <div className="container mx-auto px-4 relative h-full flex flex-col justify-end pb-16">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-24 left-4"
              onClick={() => window.history.back()}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            
            <div className="flex flex-col md:flex-row gap-8 items-end md:items-center">
              <img 
                src={posterPath}
                alt={tvShow.name}
                className="hidden md:block w-48 rounded-md shadow-xl ring-1 ring-white/10"
              />                <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  {tvShow.first_air_date && (
                    <span className="text-muted-foreground text-sm">
                      ({new Date(tvShow.first_air_date).getFullYear()})
                    </span>
                  )}
                </div>
                
                <h1 className="text-4xl md:text-5xl font-bold mb-3">{tvShow.name}</h1>
                
                <div className="flex flex-wrap gap-2 mb-4">
                  {tvShow.genres?.map((genre) => (
                    <Badge key={genre.id} variant="outline" className="bg-secondary/30">
                      {genre.name}
                    </Badge>
                  ))}
                </div>
                
                <div className="flex flex-wrap gap-4 text-sm mb-6">
                  {tvShow.first_air_date && (
                    <div>
                      <span className="text-muted-foreground mr-1">First aired:</span>
                      <span>{formatDate(tvShow.first_air_date)}</span>
                    </div>
                  )}
                  {tvShow.number_of_seasons && (
                    <div>
                      <span className="text-muted-foreground mr-1">Seasons:</span>
                      <span>{formatSeasons(tvShow.number_of_seasons)}</span>
                    </div>
                  )}
                  {tvShow.vote_average > 0 && (
                    <div>
                      <span className="text-muted-foreground mr-1">Rating:</span>
                      <span className="text-yellow-400 flex items-center gap-1">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" /> {tvShow.vote_average.toFixed(1)}
                      </span>
                    </div>
                  )}
                </div>
                
                <p className="text-base text-gray-300 mb-6 max-w-2xl">{tvShow.overview}</p>
                  <div className="flex flex-wrap gap-3">
                  {trailer ? (
                    <Button 
                      size="lg" 
                      className="gap-2"
                      onClick={() => setShowTrailerModal(true)}
                    >
                      <Play className="h-5 w-5" /> Play Trailer
                    </Button>
                  ) : (
                    <Button 
                      size="lg" 
                      variant="secondary"
                      className="gap-2"
                      disabled
                      title="No trailer available for this TV show"
                    >
                      <Play className="h-5 w-5" /> No Trailer Available
                    </Button>
                  )}<Button 
                    variant="outline" 
                    size="lg" 
                    className="gap-2"
                    onClick={handleWatchlistToggle}
                  >
                    {watchlistStatus ? (
                      <><Check className="h-5 w-5" /> In My List</>
                    ) : (
                      <><Plus className="h-5 w-5" /> Add to My List</>
                    )}
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    size="lg" 
                    className={`gap-2 ${favoriteStatus ? "bg-red-600 border-red-600 hover:bg-red-700 text-white" : ""}`}
                    onClick={handleFavoriteToggle}
                    title={favoriteStatus ? "Remove from Favorites" : "Add to Favorites"}
                  >
                    <Heart className={`h-5 w-5 ${favoriteStatus ? 'fill-current' : ''}`} />
                    {favoriteStatus ? "Favorited" : "Favorite"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Content */}
      <div className="container mx-auto px-4 py-12">
        <Tabs defaultValue="cast" className="mb-12">
          <TabsList>
            <TabsTrigger value="cast">Cast & Crew</TabsTrigger>
            <TabsTrigger value="episodes">Episodes</TabsTrigger>
            <TabsTrigger value="reviews">Reviews</TabsTrigger>
            <TabsTrigger value="videos">Videos</TabsTrigger>
          </TabsList>
          
          {/* Cast & Crew Tab */}
          <TabsContent value="cast" className="mt-8">
            <h2 className="text-2xl font-bold mb-6">Cast</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {tvShow.credits?.cast?.slice(0, 12).map((person) => (
                <Card key={person.id} className="overflow-hidden bg-secondary/10">
                  <div className="aspect-[2/3] bg-secondary/20">
                    {person.profile_path ? (
                      <img 
                        src={`https://image.tmdb.org/t/p/w300${person.profile_path}`}
                        alt={person.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-secondary/20">
                        <span className="text-muted-foreground">No image</span>
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <h3 className="font-bold text-sm line-clamp-1">{person.name}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-1">{person.character}</p>
                  </div>
                </Card>
              ))}
            </div>
            
            <h2 className="text-2xl font-bold mt-12 mb-6">Crew</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {tvShow.credits?.crew?.filter(person => 
                ["Director", "Producer", "Writer", "Creator", "Executive Producer"].includes(person.job)
              ).slice(0, 8).map((person) => (
                <Card key={`${person.id}-${person.job}`} className="bg-secondary/10">
                  <div className="p-4">
                    <h3 className="font-bold text-base">{person.name}</h3>
                    <p className="text-sm text-muted-foreground">{person.job}</p>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>
            {/* Episodes Tab */}
          <TabsContent value="episodes" className="mt-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Episodes</h2>
              {tvShow.number_of_seasons && tvShow.number_of_seasons > 1 && (
                <select 
                  value={selectedSeason} 
                  onChange={(e) => setSelectedSeason(Number(e.target.value))}
                  className="bg-secondary/20 border border-secondary/30 rounded-md px-3 py-2 text-foreground"
                >
                  {Array.from({ length: tvShow.number_of_seasons }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      Season {i + 1}
                    </option>
                  ))}
                </select>
              )}
            </div>
            
            {seasonDetails?.episodes ? (
              <EpisodeTracker
                tvShowId={tvShowId}
                episodes={seasonDetails.episodes}
                seasonNumber={selectedSeason}
                totalSeasons={tvShow.number_of_seasons || 1}
              />
            ) : (
              <Card className="bg-secondary/10 p-6 text-center">
                <p className="text-muted-foreground">
                  {seasonDetails === undefined ? "Loading episodes..." : "No episodes available for this season."}
                </p>
              </Card>
            )}
          </TabsContent>
            {/* Reviews Tab */}
          <TabsContent value="reviews" className="mt-8">
            <h2 className="text-2xl font-bold mb-6">Reviews</h2>
            {reviews && reviews.length > 0 ? (
              <div className="space-y-8">
                {reviews.slice(0, 5).map((review) => (
                  <Card key={review.id} className="bg-secondary/10">
                    <div className="p-6">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-3">
                          <div className="font-bold text-lg">{review.author}</div>
                          {review.author_details.username && review.author_details.username !== review.author && (
                            <div className="text-sm text-muted-foreground">(@{review.author_details.username})</div>
                          )}
                        </div>
                        {review.author_details.rating && (
                          <div className="text-yellow-400 font-semibold flex items-center gap-1">
                            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" /> {review.author_details.rating}/10
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mb-4">
                        {formatDate(review.created_at)}
                      </div>
                      <div className="text-gray-300 mb-4">
                        <p className="line-clamp-4">{review.content}</p>
                        {review.content.length > 500 && (
                          <button 
                            onClick={() => {
                              const element = document.getElementById(`review-${review.id}`);
                              if (element) {
                                element.classList.toggle('line-clamp-4');
                              }
                            }}
                            className="text-red-400 text-sm hover:underline mt-2"
                          >
                            Read more
                          </button>
                        )}
                      </div>
                      {review.url && (
                        <div className="mt-4">
                          <button 
                            onClick={() => window.open(review.url, '_blank', 'noopener,noreferrer')}
                            className="text-red-400 text-sm hover:underline bg-transparent border-none p-0 cursor-pointer"
                          >
                            Read full review on TMDB →
                          </button>
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
                {reviews.length > 5 && (
                  <Card className="bg-secondary/10 p-4 text-center">
                    <p className="text-muted-foreground">
                      Showing 5 of {reviews.length} reviews. Visit TMDB for more reviews.
                    </p>
                  </Card>
                )}
              </div>
            ) : (
              <Card className="bg-secondary/10 p-6 text-center">
                <p className="text-muted-foreground">
                  {reviews === undefined ? "Loading reviews..." : "No reviews available for this TV show yet."}
                </p>
              </Card>
            )}
          </TabsContent>
            {/* Videos Tab */}
          <TabsContent value="videos" className="mt-8">
            <h2 className="text-2xl font-bold mb-6">Videos</h2>
            {videos && videos.length > 0 ? (
              <div>
                {['Trailer', 'Teaser', 'Clip', 'Behind the Scenes', 'Featurette'].map(videoType => {
                  const typeVideos = videos.filter(video => 
                    video.site === "YouTube" && video.type === videoType
                  );
                  
                  if (typeVideos.length === 0) return null;
                  
                  return (
                    <div key={videoType} className="mb-8">
                      <h3 className="text-xl font-semibold mb-4">{videoType}s</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {typeVideos.slice(0, 6).map((video) => (
                          <TrailerPlayer key={video.id} videoKey={video.key} title={video.name} />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <Card className="bg-secondary/10 p-6 text-center">
                <p className="text-muted-foreground">
                  {videos === undefined ? "Loading videos..." : "No videos available for this TV show."}
                </p>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Where to Watch */}
        <div className="mb-12">
          <WatchProviders mediaId={tvShowId} mediaType="tv" />
        </div>
        
        {/* Similar TV Shows - horizontal scroller */}
        <div className="mt-12">
          <h3 className="text-xl font-bold mb-4">More shows like this</h3>
          {similarShows && similarShows.length > 0 ? (
            <div className="relative">
              <div className="overflow-x-auto overflow-y-visible scrollbar-hide">
                <div className="flex gap-4 pb-2">
                  {similarShows.slice(0, 20).map((s) => (
                    <div key={s.id} className="flex-shrink-0 w-56 overflow-visible">
                      <TVShowCard show={s} />
                    </div>
                  ))}
                </div>
              </div>
              {/* Fading edges */}
              <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-background to-transparent" />
              <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-background to-transparent" />
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">No similar shows available.</div>
          )}
        </div>

        {/* Recommended TV Shows - horizontal scroller */}
        <div className="mt-12">
          <h3 className="text-xl font-bold mb-4">Recommended TV Shows</h3>
          {recommendedShows && recommendedShows.length > 0 ? (
            <div className="relative">
              <div className="overflow-x-auto overflow-y-visible scrollbar-hide">
                <div className="flex gap-4 pb-2">
                  {recommendedShows.slice(0, 20).map((s) => (
                    <div key={s.id} className="flex-shrink-0 w-56 overflow-visible">
                      <TVShowCard show={s} />
                    </div>
                  ))}
                </div>
              </div>
              {/* Fading edges */}
              <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-background to-transparent" />
              <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-background to-transparent" />
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">No recommendations available.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TVShowDetail;
