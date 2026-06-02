import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Play, Tv, Clock } from "lucide-react";
import { Link } from "wouter";

interface WatchHistoryGridProps {
  title: string;
  items: any[];
  isLoading: boolean;
  emptyMessage: string;
  emptyAction?: React.ReactNode;
  getMediaTitle: (media: any) => string;
  getMediaPosterUrl: (media: any) => string;
  getMediaReleaseYear: (media: any) => string | null;
  isMovie: (media: any) => boolean;
}

const WatchHistoryGrid: React.FC<WatchHistoryGridProps> = ({
  title,
  items,
  isLoading,
  emptyMessage,
  emptyAction,
  getMediaTitle,
  getMediaPosterUrl,
  getMediaReleaseYear,
  isMovie
}) => {
  const formatLastWatched = (lastWatched?: string): string => {
    if (!lastWatched) return "Recently";
    
    const date = new Date(lastWatched);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return "Just now";
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
    return date.toLocaleDateString();
  };

  const getProgressColor = (progress: number): string => {
    if (progress >= 90) return "bg-green-500";
    if (progress >= 50) return "bg-yellow-500";
    return "bg-red-500";
  };

  const getProgressLabel = (progress: number): string => {
    if (progress >= 90) return "Completed";
    if (progress >= 50) return "In Progress";
    return "Started";
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h2 className="text-lg md:text-2xl font-bold">{title}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <Card key={index} className="bg-card/50 backdrop-blur-sm border-border/50">
              <CardContent className="p-4">
                <div className="flex gap-4">
                  <Skeleton className="w-16 h-24 rounded" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-3 w-2/3" />
                    <Skeleton className="h-2 w-full" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="mb-6">
          <div className="w-24 h-24 bg-muted/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Clock className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold mb-2">{emptyMessage}</h3>
          <p className="text-muted-foreground mb-6">
            Your viewing history will appear here
          </p>
          {emptyAction}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg md:text-2xl font-bold">{title}</h2>
        <div className="text-sm text-muted-foreground">
          {items.length} {items.length === 1 ? 'item' : 'items'}
        </div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((media) => (
          <Card 
            key={media.id} 
            className="group bg-card/50 backdrop-blur-sm border-border/50 hover:bg-card/70 transition-all duration-200 hover:scale-105 hover:shadow-lg"
          >
            <CardContent className="p-4">
              <div className="flex gap-4">
                {/* Poster Thumbnail */}
                <div className="relative flex-shrink-0">                  <img
                    src={getMediaPosterUrl(media)}
                    alt={getMediaTitle(media)}
                    className="w-16 h-24 object-cover rounded"
                    loading="lazy"
                  />
                </div>
                
                {/* Media Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm truncate mb-1">
                        {getMediaTitle(media)}
                      </h3>
                      <p className="text-xs text-muted-foreground mb-2">
                        {getMediaReleaseYear(media)}
                      </p>
                    </div>
                    
                    {/* Continue Watching Button */}
                    <Button
                      asChild
                      variant="ghost"
                      size="sm"
                      className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 ml-2 h-8 px-2"
                    >
                      <Link href={`/watch/${media.id}`} className="flex items-center gap-1">
                        <Play className="w-3 h-3" />
                        <span className="text-xs">Play</span>
                      </Link>
                    </Button>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="mb-2">
                    <Progress 
                      value={media.progress || 0} 
                      className="h-2"
                    />
                  </div>
                  
                  {/* Progress Info */}
                  <div className="flex items-center justify-between text-xs">
                    <span className={`px-2 py-1 rounded-full text-white ${getProgressColor(media.progress || 0)}`}>
                      {getProgressLabel(media.progress || 0)}
                    </span>
                    <span className="text-muted-foreground">
                      {formatLastWatched(media.lastWatched)}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default WatchHistoryGrid;
