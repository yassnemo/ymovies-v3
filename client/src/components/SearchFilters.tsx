import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { getGenres, getTVGenres, getCountries, getLanguages } from "@/lib/tmdb";
import { SearchFilters as SearchFiltersType } from "@/lib/tmdb";

interface SearchFiltersProps {
  filters: SearchFiltersType;
  onFiltersChange: (filters: SearchFiltersType) => void;
  mediaType: 'movie' | 'tv' | 'both';
}

const SearchFilters: React.FC<SearchFiltersProps> = ({
  filters,
  onFiltersChange,
  mediaType
}) => {
  const [isOpen, setIsOpen] = useState(false);

  // Fetch data for filter options
  const { data: movieGenres } = useQuery({
    queryKey: ['/api/genres/movie'],
    queryFn: getGenres,
    enabled: mediaType === 'movie' || mediaType === 'both'
  });

  const { data: tvGenres } = useQuery({
    queryKey: ['/api/genres/tv'],
    queryFn: getTVGenres,
    enabled: mediaType === 'tv' || mediaType === 'both'
  });

  const { data: countries } = useQuery({
    queryKey: ['/api/countries'],
    queryFn: getCountries,
  });

  const { data: languages } = useQuery({
    queryKey: ['/api/languages'],
    queryFn: getLanguages,
  });

  // Combine genres if showing both media types
  const genres = mediaType === 'both' 
    ? [...(movieGenres || []), ...(tvGenres || [])].filter((genre, index, self) => 
        index === self.findIndex(g => g.id === genre.id)
      )
    : mediaType === 'movie' ? movieGenres : tvGenres;

  // Generate year options (current year to 1900)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 1899 }, (_, i) => currentYear - i);

  // Sort options
  const sortOptions = [
    { value: 'popularity.desc', label: 'Most Popular' },
    { value: 'popularity.asc', label: 'Least Popular' },
    { value: 'release_date.desc', label: 'Latest Release' },
    { value: 'release_date.asc', label: 'Oldest Release' },
    { value: 'vote_average.desc', label: 'Highest Rated' },
    { value: 'vote_average.asc', label: 'Lowest Rated' },
  ];

  // Rating options
  const ratingOptions = [
    { value: 9, label: '9+ Excellent' },
    { value: 8, label: '8+ Very Good' },
    { value: 7, label: '7+ Good' },
    { value: 6, label: '6+ Above Average' },
    { value: 5, label: '5+ Average' },
  ];

  const updateFilter = (key: keyof SearchFiltersType, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value === '' ? undefined : value
    });
  };

  const clearFilters = () => {
    onFiltersChange({});
  };

  const hasActiveFilters = Object.values(filters).some(value => value !== undefined);

  return (
    <div className="flex items-center gap-2">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="flex items-center gap-2"
            size="sm"
          >
            <Filter className="h-4 w-4" />
            Filters
            {hasActiveFilters && (
              <Badge variant="secondary" className="h-5 w-5 p-0 flex items-center justify-center text-xs">
                {Object.values(filters).filter(v => v !== undefined).length}
              </Badge>
            )}
            <ChevronDown className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-4" align="start">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-section-title font-semibold">Search Filters</h3>
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="text-xs"
                >
                  Clear All
                </Button>
              )}
            </div>

            {/* Sort By */}
            <div className="space-y-2">
              <Label htmlFor="sortBy">Sort By</Label>
              <Select
                value={filters.sortBy || ''}
                onValueChange={(value) => updateFilter('sortBy', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select sort order" />
                </SelectTrigger>
                <SelectContent>
                  {sortOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Genre */}
            {genres && genres.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="genre">Genre</Label>
                <Select
                  value={filters.genre?.toString() || ''}
                  onValueChange={(value) => updateFilter('genre', value ? parseInt(value) : undefined)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select genre" />
                  </SelectTrigger>
                  <SelectContent>
                    {genres.map((genre) => (
                      <SelectItem key={genre.id} value={genre.id.toString()}>
                        {genre.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Year */}
            <div className="space-y-2">
              <Label htmlFor="year">Year</Label>
              <Select
                value={filters.year?.toString() || ''}
                onValueChange={(value) => updateFilter('year', value ? parseInt(value) : undefined)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent>
                  {years.slice(0, 50).map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Rating */}
            <div className="space-y-2">
              <Label htmlFor="rating">Minimum Rating</Label>
              <Select
                value={filters.rating?.toString() || ''}
                onValueChange={(value) => updateFilter('rating', value ? parseInt(value) : undefined)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select minimum rating" />
                </SelectTrigger>
                <SelectContent>
                  {ratingOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value.toString()}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Country */}
            {countries && countries.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Select
                  value={filters.country || ''}
                  onValueChange={(value) => updateFilter('country', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent>
                    {countries.slice(0, 50).map((country) => (
                      <SelectItem key={country.iso_3166_1} value={country.iso_3166_1}>
                        {country.english_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Language */}
            {languages && languages.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="language">Original Language</Label>
                <Select
                  value={filters.language || ''}
                  onValueChange={(value) => updateFilter('language', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    {languages.slice(0, 30).map((language) => (
                      <SelectItem key={language.iso_639_1} value={language.iso_639_1}>
                        {language.english_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="flex items-center gap-1 flex-wrap">
          {filters.sortBy && (
            <Badge variant="secondary" className="text-xs">
              {sortOptions.find(s => s.value === filters.sortBy)?.label}
              <X
                className="h-3 w-3 ml-1 cursor-pointer"
                onClick={() => updateFilter('sortBy', undefined)}
              />
            </Badge>
          )}
          {filters.genre && genres && (
            <Badge variant="secondary" className="text-xs">
              {genres.find(g => g.id === filters.genre)?.name}
              <X
                className="h-3 w-3 ml-1 cursor-pointer"
                onClick={() => updateFilter('genre', undefined)}
              />
            </Badge>
          )}
          {filters.year && (
            <Badge variant="secondary" className="text-xs">
              {filters.year}
              <X
                className="h-3 w-3 ml-1 cursor-pointer"
                onClick={() => updateFilter('year', undefined)}
              />
            </Badge>
          )}
          {filters.rating && (
            <Badge variant="secondary" className="text-xs">
              {filters.rating}+ rating
              <X
                className="h-3 w-3 ml-1 cursor-pointer"
                onClick={() => updateFilter('rating', undefined)}
              />
            </Badge>
          )}
          {filters.country && countries && (
            <Badge variant="secondary" className="text-xs">
              {countries.find(c => c.iso_3166_1 === filters.country)?.english_name}
              <X
                className="h-3 w-3 ml-1 cursor-pointer"
                onClick={() => updateFilter('country', undefined)}
              />
            </Badge>
          )}
          {filters.language && languages && (
            <Badge variant="secondary" className="text-xs">
              {languages.find(l => l.iso_639_1 === filters.language)?.english_name}
              <X
                className="h-3 w-3 ml-1 cursor-pointer"
                onClick={() => updateFilter('language', undefined)}
              />
            </Badge>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchFilters;
