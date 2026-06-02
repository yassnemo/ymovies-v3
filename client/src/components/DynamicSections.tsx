import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import MovieSlider from '@/components/MovieSlider';
import { ContentSection } from '@/lib/dynamicSections';
import { Movie } from '@/types/movie';
import { TVShow } from '@/types/tvshow';
import { MediaItem } from '@/lib/tmdb';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DynamicSectionRendererProps {
  section: ContentSection;
  onRefresh?: () => void;
}

const DynamicSectionRenderer: React.FC<DynamicSectionRendererProps> = ({ 
  section, 
  onRefresh 
}) => {
  const [content, setContent] = useState<(Movie | TVShow | MediaItem)[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Use React Query for caching and error handling
  const { data, isError, isLoading: queryLoading, refetch } = useQuery({
    queryKey: [`dynamic-section-${section.id}`],
    queryFn: section.fetchFunction,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
  useEffect(() => {
    if (data && Array.isArray(data)) {
      setContent(data);
      setError(null);
    }
    setIsLoading(queryLoading);
  }, [data, queryLoading]);

  useEffect(() => {
    if (isError) {
      setError(`Failed to load ${section.title}`);
      setIsLoading(false);
    }
  }, [isError, section.title]);

  // Don't render empty sections
  if (!isLoading && (!content || content.length === 0)) {
    return null;
  }

  return (
    <div className="relative">
      {/* Section header */}
      <div className="px-4 mb-2">
        <h2 className="text-lg md:text-2xl font-bold text-white">{section.title}</h2>
      </div>

      {/* Error state */}
      {error && (
        <div className="px-4 py-2 text-red-400 text-sm">
          {error}
          <Button
            variant="link"
            size="sm"
            onClick={() => refetch()}
            className="ml-2 text-red-400 hover:text-red-300"
          >
            Try again
          </Button>
        </div>
      )}

      {/* Content */}
      {!error && (
        <MovieSlider
          title=""
          movies={content}
          isLoading={isLoading}
          mediaType={section.mediaType === 'tv' ? 'tv' : 'movie'}
          showTitle={false}
        />
      )}

      {/* Section type indicator */}
      {section.seasonal && (
        <div className="absolute top-0 right-4">
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30">
            Seasonal
          </span>
        </div>
      )}
    </div>
  );
};

interface DynamicSectionsProps {
  sections: ContentSection[];
  isLoading: boolean;
  onRefreshSections?: () => void;
  isAuthenticated?: boolean;
}

const DynamicSections: React.FC<DynamicSectionsProps> = ({ 
  sections, 
  isLoading,
  onRefreshSections,
  isAuthenticated = false
}) => {
  if (isLoading) {
    return (
      <div className="space-y-8">
        {[...Array(3)].map((_, index) => (
          <div key={index} className="animate-pulse">
            <div className="px-4 mb-4">
              <div className="h-6 bg-gray-700 rounded w-48"></div>
            </div>
            <div className="px-4">
              <div className="flex space-x-4 overflow-hidden">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="flex-shrink-0">
                    <div className="w-40 h-60 bg-gray-700 rounded"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Render each section */}
      {sections.map((section) => (
        <DynamicSectionRenderer
          key={section.id}
          section={section}
          onRefresh={onRefreshSections}
        />
      ))}

      {/* Encourage non-authenticated users to sign up for more content */}
      {!isAuthenticated && sections.length > 0 && (
        <div className="px-4 py-8 text-center bg-gradient-to-r from-red-900/20 to-red-800/20 rounded-lg mx-4 border border-red-700/30">
          <h3 className="text-xl font-semibold text-white mb-2">
            Want to see more personalized content?
          </h3>
          <p className="text-gray-300 mb-4">
            Sign up to unlock unlimited dynamic sections, personalized recommendations, and more exclusive content!
          </p>          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button 
              asChild 
              className="bg-red-600 hover:bg-red-700 text-white font-semibold px-6 py-2"
            >
              <Link href="/signup">Sign Up Free</Link>
            </Button>
            <Button 
              asChild 
              variant="outline" 
              className="border-gray-600 text-white hover:bg-gray-700"
            >
              <Link href="/signin">Sign In</Link>
            </Button>
          </div>
        </div>
      )}


    </div>
  );
};

export default DynamicSections;
