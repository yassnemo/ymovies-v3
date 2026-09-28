import React from "react";
import MovieCard from "./MovieCard";
import { LoadingSkeleton } from "./LoadingSkeleton";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { X, Star } from "lucide-react";

interface MediaGridProps {
  title?: string;
  items: any[];
  isLoading: boolean;
  onRemove?: (id: number) => void;
  emptyMessage: string;
  emptyAction?: React.ReactNode;
  getMediaTitle: (media: any) => string;
  getMediaPosterUrl: (media: any) => string;
  getMediaReleaseYear: (media: any) => string | null;
  selectable?: boolean;
  selectedIds?: number[] | Set<number>;
  onToggleSelect?: (id: number) => void;
  watchProgressMap?: Record<number, number>;
}

const MediaGrid: React.FC<MediaGridProps> = ({
  title, items, isLoading, onRemove, emptyMessage, emptyAction,
  getMediaTitle, selectable = false, selectedIds, onToggleSelect, watchProgressMap,
}) => {
  const isSelected = (id: number) => Array.isArray(selectedIds)
    ? selectedIds.includes(id) : selectedIds?.has(id) ?? false;

  if (!isLoading && items.length === 0) return (
    <div className="py-16 text-center">
      <Star className="mx-auto mb-4 h-8 w-8 text-muted-foreground" />
      <h3 className="mb-2 text-section-title font-semibold">{emptyMessage}</h3>
      <p className="mb-6 text-body text-muted-foreground">Start exploring to build your collection</p>
      {emptyAction}
    </div>
  );

  return (
    <div className="space-y-4">
      {title && <h2 className="text-section-title font-bold">{title}</h2>}
      <div className="media-grid">
        {isLoading ? Array.from({ length: 12 }, (_, index) => (
          <LoadingSkeleton key={index} variant="movie-card" />
        )) : items.map(media => (
          <div key={media.id} className="media-card-slot group relative">
            <MovieCard movie={media} mediaType={media.media_type === "tv" || Boolean(media.name || media.original_name || media.first_air_date) ? "tv" : "movie"}
              watchProgress={watchProgressMap?.[media.id]} />
            {selectable && (
              <div className="absolute left-2 top-2 z-40">
                <Checkbox aria-label={`Select ${getMediaTitle(media)}`} checked={isSelected(media.id)}
                  onCheckedChange={() => onToggleSelect?.(media.id)} />
              </div>
            )}
            {onRemove && (
              <Button variant="ghost" size="sm" aria-label={`Remove ${getMediaTitle(media)}`}
                className="media-remove absolute top-2 right-2 z-40 h-8 w-8 rounded-full bg-black/70 p-0 text-white opacity-0 transition-opacity hover:bg-red-600 group-hover:opacity-100 focus-visible:opacity-100"
                onClick={() => onRemove(media.id)}><X className="h-4 w-4" /></Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
export default MediaGrid;
