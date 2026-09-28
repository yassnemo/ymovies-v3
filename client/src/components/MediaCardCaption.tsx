import React from "react";
import { Star } from "lucide-react";

export default function MediaCardCaption({ title, year, rating }: { title: string; year: number | null; rating: number }) {
  return (
    <div className="mt-3 px-0.5">
      <p className="h-5 truncate text-card-title font-medium leading-5 text-gray-100" title={title}>{title}</p>
      <div className="mt-1 flex h-4 items-center justify-between gap-2 text-caption leading-4 text-gray-500">
        <span>{year && Number.isFinite(year) ? year : ""}</span>
        {rating > 0 && <span aria-label={`Rating ${rating.toFixed(1)} out of 10`} className="inline-flex items-center gap-1 text-gray-400">
          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />{rating.toFixed(1)}
        </span>}
      </div>
    </div>
  );
}
