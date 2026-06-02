import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { X, Play, Star } from "lucide-react";
import { Link } from "wouter";
import { Checkbox } from "@/components/ui/checkbox";

interface MediaGridProps {
  title: string;
  items: any[];
  isLoading: boolean;
  onRemove?: (id: number) => void;
  emptyMessage: string;
  emptyAction?: React.ReactNode;
  getMediaTitle: (media: any) => string;
  getMediaPosterUrl: (media: any) => string;
  getMediaReleaseYear: (media: any) => string | null;
  viewMode?: "grid" | "list";
  selectable?: boolean;
  selectedIds?: number[] | Set<number>;
  onToggleSelect?: (id: number) => void;
  watchProgressMap?: Record<number, number>;
}

const MediaGrid: React.FC<MediaGridProps> = ({
  title,
  items,
  isLoading,
  onRemove,
  emptyMessage,
  emptyAction,
  getMediaTitle,
  getMediaPosterUrl,
  getMediaReleaseYear,
  viewMode = "grid",
  selectable = false,
  selectedIds,
  onToggleSelect,
  watchProgressMap,
}) => {  if (isLoading) {
    return (
      <div className="space-y-6">
        <h2 className="text-lg md:text-2xl font-bold">{title}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {Array.from({ length: 12 }).map((_, index) => (
            <LoadingSkeleton key={index} variant="movie-card" />
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
            <Star className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold mb-2">{emptyMessage}</h3>
          <p className="text-muted-foreground mb-6">
            Start exploring to build your collection
          </p>
          {emptyAction}
        </div>
      </div>
    );
  }

  const isSelected = (id: number) => {
    if (!selectedIds) return false;
    if (Array.isArray(selectedIds)) return selectedIds.includes(id);
    return (selectedIds as Set<number>).has(id);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg md:text-2xl font-bold">{title}</h2>
        <div className="text-sm text-muted-foreground">
          {items.length} {items.length === 1 ? 'item' : 'items'}
        </div>
      </div>

      {viewMode === "list" ? (
        <div className="space-y-3">
          {items.map((media) => {
            const title = getMediaTitle(media);
            const year = getMediaReleaseYear(media);
            const poster = getMediaPosterUrl(media);
            const isTv = !!media.first_air_date || !!media.original_name;
            const detailsHref = isTv ? `/tv/${media.id}` : `/movie/${media.id}`;
            return (
              <Card key={media.id} className="bg-card/50 backdrop-blur-sm border-border/50 hover:bg-card/70 transition-colors">
                <CardContent className="p-3">
                  <div className="flex items-center gap-3">
                    {selectable && (
                      <Checkbox
                        checked={isSelected(media.id)}
                        onCheckedChange={() => onToggleSelect && onToggleSelect(media.id)}
                        className="shrink-0"
                      />
                    )}
                    <Link href={detailsHref} className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="relative shrink-0">
                        <img src={poster} alt={title} className="w-12 h-18 object-cover rounded" loading="lazy" />
                        {watchProgressMap && watchProgressMap[media.id] > 0 && (
                          <div className="absolute bottom-0 left-0 right-0 bg-gray-900/80 h-0.5 rounded-b">
                            <div className="bg-red-600 h-0.5 rounded-b" style={{ width: `${watchProgressMap[media.id]}%` }} />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{title}</div>
                        <div className="text-xs text-muted-foreground">{year}</div>
                        {watchProgressMap && watchProgressMap[media.id] > 0 && (
                          <div className="flex items-center gap-2 mt-1">
                            <div className="w-16 bg-gray-800 rounded-full h-1">
                              <div className="bg-red-600 h-1 rounded-full" style={{ width: `${watchProgressMap[media.id]}%` }} />
                            </div>
                            <span className="text-[10px] text-muted-foreground">{watchProgressMap[media.id]}%</span>
                          </div>
                        )}
                      </div>
                    </Link>
                    <div className="flex items-center gap-2">
                      <Button asChild size="sm" variant="secondary">
                        <Link href={detailsHref}>
                          <Play className="w-4 h-4 mr-1" /> Play
                        </Link>
                      </Button>
                      {onRemove && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onRemove(media.id);
                          }}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {items.map((media) => (
            <Card 
              key={media.id} 
              className="group bg-card/50 backdrop-blur-sm border-border/50 hover:bg-card/70 transition-all duration-200 hover:scale-105 hover:shadow-lg"
            >
              <CardContent className="p-0 relative">
                {/* Selection Checkbox */}
                {selectable && (
                  <div className="absolute top-2 left-2 z-10">
                    <Checkbox
                      checked={isSelected(media.id)}
                      onCheckedChange={() => onToggleSelect && onToggleSelect(media.id)}
                    />
                  </div>
                )}

                {/* Remove Button */}
                {onRemove && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute top-2 right-2 z-10 w-8 h-8 p-0 bg-black/50 hover:bg-red-600 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onRemove(media.id);
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
                
                {/* Play Button Overlay */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center rounded-t-lg">
                  <Button
                    asChild
                    variant="ghost" 
                    size="sm"
                    className="bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white border-white/20"
                  >
                    {/* Prefer navigating to details for play - align with app routes */}
                    <Link href={`/${media.first_air_date ? 'tv' : 'movie'}/${media.id}`}>
                      <Play className="w-4 h-4 mr-1" />
                      Play
                    </Link>
                  </Button>
                </div>
                
                {/* Poster Image */}
                <div className="relative">
                  <img
                    src={getMediaPosterUrl(media)}
                    alt={getMediaTitle(media)}
                    className="w-full aspect-[2/3] object-cover rounded-t-lg"
                    loading="lazy"
                  />
                  {watchProgressMap && watchProgressMap[media.id] > 0 && (
                    <div className="absolute bottom-0 left-0 right-0 bg-gray-900/80 h-1">
                      <div className="bg-red-600 h-1" style={{ width: `${watchProgressMap[media.id]}%` }} />
                    </div>
                  )}
                </div>
                
                {/* Media Info */}
                <div className="p-3">
                  <h3 className="font-medium text-sm truncate mb-1">
                    {getMediaTitle(media)}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {getMediaReleaseYear(media)}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default MediaGrid;
