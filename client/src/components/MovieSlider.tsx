import React, { useState, useRef, useEffect } from "react";
import { Movie } from "@/types/movie";
import { TVShow } from "@/types/tvshow";
import MovieCard from "./MovieCard";
import TVShowCard from "./TVShowCard";
import { LoadingSkeleton } from "./LoadingSkeleton";
import { ChevronRight, ChevronLeft, Film, Tv } from "lucide-react";

type MediaItem = Movie | TVShow;

interface MovieSliderProps {
  title: string;
  movies: MediaItem[] | undefined;
  isLoading?: boolean;
  mediaType?: 'movie' | 'tv' | 'mixed';
  showTitle?: boolean;
}

const MovieSlider = ({ 
  title, 
  movies = [], 
  isLoading = false,
  mediaType = 'movie',
  showTitle = true
}: MovieSliderProps) => {
  const sliderRef = useRef<HTMLDivElement>(null);
  const [showRightButton, setShowRightButton] = useState(true);
  const [showLeftButton, setShowLeftButton] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  
  // Check if we need to show scroll buttons based on content width and scroll position
  useEffect(() => {
    const checkForScrollButtons = () => {
      if (sliderRef.current) {
        const { scrollWidth, clientWidth, scrollLeft } = sliderRef.current;
        setShowRightButton(scrollWidth > clientWidth && scrollLeft < scrollWidth - clientWidth - 20);
        setShowLeftButton(scrollLeft > 20);
      }
    };

    checkForScrollButtons();
    
    const sliderElement = sliderRef.current;
    if (sliderElement) {
      sliderElement.addEventListener("scroll", checkForScrollButtons);
      window.addEventListener("resize", checkForScrollButtons);
    }
    
    return () => {
      if (sliderElement) {
        sliderElement.removeEventListener("scroll", checkForScrollButtons);
      }
      window.removeEventListener("resize", checkForScrollButtons);
    };
  }, [movies]);

  // Handle scrolling right
  const scrollRight = () => {
    if (sliderRef.current) {
      const { scrollLeft, clientWidth } = sliderRef.current;
      const newScrollLeft = scrollLeft + clientWidth - 100; // Offset for overlap
      
      sliderRef.current.scrollTo({
        left: newScrollLeft,
        behavior: "smooth"
      });
    }
  };

  // Handle scrolling left
  const scrollLeft = () => {
    if (sliderRef.current) {
      const { scrollLeft, clientWidth } = sliderRef.current;
      const newScrollLeft = scrollLeft - clientWidth + 100; // Offset for overlap
      
      sliderRef.current.scrollTo({
        left: Math.max(0, newScrollLeft),
        behavior: "smooth"
      });
    }
  };

  if (isLoading) {
    return (
      <section className="mt-8 px-4">
        {/* Enhanced title skeleton */}
        {showTitle && <LoadingSkeleton variant="slider-title" />}
        
        {/* Enhanced movie/TV card skeletons based on media type */}
        <div className="flex overflow-x-auto space-x-8 pb-6 pt-2 px-2 scrollbar-hide">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex-shrink-0 w-56">
              {/* TV sliders now use the same vertical card size as movies */}
              <LoadingSkeleton 
                variant="movie-card"
                className="w-56"
              />
            </div>
          ))}
        </div>
      </section>
    );
  }
  
  // If no movies or empty array, return null - but log the issue for debugging
  if (!movies || movies.length === 0) {
    console.log(`No movies for section: ${title}`, movies);
    return null;
  }

  return (
    <section 
      className="mt-8 px-4 relative group/slider w-full"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {showTitle && (
        <div className="flex items-center mb-2">
          <h2 className="text-lg md:text-2xl font-bold ml-2 group-hover/slider:text-red-600 transition-colors duration-300">{title}</h2>
          <div className="h-px flex-grow bg-gray-800 ml-4 opacity-0 group-hover/slider:opacity-100 transition-opacity duration-300"></div>
        </div>
      )}
      
      <div className="relative overflow-visible">
        {/* Left scroll button */}
        {showLeftButton && (
          <button 
            className={`absolute -left-4 top-1/2 transform -translate-y-1/2 z-10
              bg-black/40 hover:bg-black/80 rounded-full p-1.5
              transition-all duration-300 ease-in-out
              ${isHovered ? 'opacity-100 -translate-x-2' : 'opacity-0 translate-x-0'}
              hidden md:flex items-center justify-center`}
            onClick={scrollLeft}
            aria-label="Scroll left"
          >
            <ChevronLeft className="h-6 w-6 text-white" />
          </button>
        )}
        
        {/* Movie slider */}
        <div 
          ref={sliderRef}
          className="slider-container category-slider flex overflow-x-auto space-x-8 pb-8 pt-8 px-2 scrollbar-hide max-w-full"
          style={{ 
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            overflowY: 'visible',
            paddingTop: '2rem',
            paddingBottom: '2rem',
          }}
        >
          {movies.map((item, index) => {
            // Determine if this is a TV show by checking for name property
            const isTV = 'name' in item;
            
            return (
              <div 
                key={item.id} 
                className={`flex-shrink-0 transition-transform duration-500 ease-out w-56`}
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                {isTV ? (
                  <TVShowCard show={item as TVShow} />
                ) : (
                  <MovieCard movie={item as Movie} />
                )}
              </div>
            );
          })}
        </div>
        
        {/* Right scroll button */}
        {showRightButton && (
          <button 
            className={`absolute -right-4 top-1/2 transform -translate-y-1/2 z-10
              bg-black/40 hover:bg-black/80 rounded-full p-1.5
              transition-all duration-300 ease-in-out
              ${isHovered ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-2'}
              hidden md:flex items-center justify-center`}
            onClick={scrollRight}
            aria-label="Scroll right"
          >
            <ChevronRight className="h-6 w-6 text-white" />
          </button>
        )}
        
        {/* Gradient effect on edges for horizontal scrolling */}
        <div className="absolute top-0 left-0 bottom-0 w-12 bg-gradient-to-r from-background to-transparent z-0 pointer-events-none"></div>
        <div className="absolute top-0 right-0 bottom-0 w-12 bg-gradient-to-l from-background to-transparent z-0 pointer-events-none"></div>
      </div>
      
      {/* Bottom reflection effect */}
      <div className={`absolute left-0 right-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-red-600/30 to-transparent transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'}`}></div>
    </section>
  );
};

// Add custom CSS for hiding scrollbars
const style = document.createElement('style');
style.textContent = `
  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }
`;
document.head.appendChild(style);

export default MovieSlider;
