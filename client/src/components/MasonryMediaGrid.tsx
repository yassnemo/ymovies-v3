import React from "react";
import MediaGrid from "./MediaGrid";

interface MasonryMediaGridProps {
  items: any[];
  onRemove?: (id: number) => void;
  getMediaTitle: (media: any) => string;
  getMediaPosterUrl: (media: any) => string;
  getMediaReleaseYear: (media: any) => string | null;
  selectable?: boolean;
  selectedIds?: number[] | Set<number>;
  onToggleSelect?: (id: number) => void;
}

const MasonryMediaGrid: React.FC<MasonryMediaGridProps> = props => (
  <MediaGrid {...props} isLoading={false} emptyMessage="No titles in this collection yet" />
);
export default MasonryMediaGrid;
