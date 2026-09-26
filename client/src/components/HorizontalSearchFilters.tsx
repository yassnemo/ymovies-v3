import React from "react";
import { ArrowUpDown, Calendar, ChevronDown, Star, X } from "lucide-react";
import { SearchFilters as SearchFiltersType } from "@/lib/tmdb";

interface HorizontalSearchFiltersProps {
  filters: SearchFiltersType;
  onFiltersChange: (filters: SearchFiltersType) => void;
}

const sortOptions: { value: NonNullable<SearchFiltersType["sortBy"]>; label: string }[] = [
  { value: "popularity.desc", label: "Most popular" },
  { value: "release_date.desc", label: "Newest first" },
  { value: "release_date.asc", label: "Oldest first" },
  { value: "vote_average.desc", label: "Top rated" },
];

const chipClass = "h-10 appearance-none rounded-full border bg-[#171717] pl-9 pr-8 text-sm font-medium outline-none transition-colors [color-scheme:dark] focus-visible:ring-2 focus-visible:ring-red-500/60";

const HorizontalSearchFilters = ({ filters, onFiltersChange }: HorizontalSearchFiltersProps) => {
  const years = Array.from({ length: 30 }, (_, index) => new Date().getFullYear() - index);
  const hasActiveFilters = Object.values(filters).some((value) => value !== undefined);

  return (
    <div className="flex flex-wrap items-center gap-2" aria-label="Search filters">
      <label className="relative shrink-0">
        <ArrowUpDown className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <select
          aria-label="Sort results"
          value={filters.sortBy || ""}
          onChange={(event) => onFiltersChange({ ...filters, sortBy: event.target.value ? event.target.value as SearchFiltersType["sortBy"] : undefined })}
          className={chipClass + (filters.sortBy ? " border-red-500/50 bg-red-500/10 text-white" : " border-white/10 text-gray-200")}
        >
          <option value="">Sort</option>
          {sortOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
      </label>

      <label className="relative shrink-0">
        <Calendar className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <select
          aria-label="Filter by year"
          value={filters.year || ""}
          onChange={(event) => onFiltersChange({ ...filters, year: event.target.value ? Number(event.target.value) : undefined })}
          className={chipClass + (filters.year ? " border-red-500/50 bg-red-500/10 text-white" : " border-white/10 text-gray-200")}
        >
          <option value="">Year</option>
          {years.map((year) => <option key={year} value={year}>{year}</option>)}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
      </label>

      <label className="relative shrink-0">
        <Star className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <select
          aria-label="Filter by minimum rating"
          value={filters.rating || ""}
          onChange={(event) => onFiltersChange({ ...filters, rating: event.target.value ? Number(event.target.value) : undefined })}
          className={chipClass + (filters.rating ? " border-red-500/50 bg-red-500/10 text-white" : " border-white/10 text-gray-200")}
        >
          <option value="">Rating</option>
          {[9, 8, 7, 6, 5].map((rating) => <option key={rating} value={rating}>{rating}+ rated</option>)}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
      </label>

      {hasActiveFilters && (
        <button
          type="button"
          onClick={() => onFiltersChange({})}
          className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-gray-300 transition-colors hover:text-white active:scale-95"
        >
          Clear <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
};

export default HorizontalSearchFilters;
