import React, { useMemo, useState, useEffect, useRef } from "react";
import { Movie } from "@/types/movie";
import { TVShow } from "@/types/tvshow";
import { useLocation } from "wouter";
import { Play, Info, Star, ChevronLeft, ChevronRight } from "lucide-react";
import { getMovieLogos, getTVLogos, pickBestLogo } from "@/lib/tmdb";

interface HeroBannerProps {
  content: Movie | TVShow;
  onNext?: () => void;
  onPrevious?: () => void;
  onIndicatorClick?: (index: number) => void;
  currentIndex?: number;
  totalItems?: number;
}

const HeroBanner = ({ content, onNext, onPrevious, onIndicatorClick, currentIndex = 0, totalItems = 1 }: HeroBannerProps) => {
  const [, navigate] = useLocation();
  const [isLoaded, setIsLoaded] = useState(true); // Start as loaded for initial render
  const [isHovered, setIsHovered] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [imageKey, setImageKey] = useState(0);
  const [displayedContent, setDisplayedContent] = useState(content); // Content currently being displayed
  const [logoPath, setLogoPath] = useState<string | null>(null);
  
  // Handle content changes with smooth transitions
  useEffect(() => {
    // Don't transition if it's the same content
    if (displayedContent?.id === content?.id) {
      return;
    }
    
    // Start transition - fade out current content
    setIsTransitioning(true);
    setIsLoaded(false);
    
    // Preload the new image before updating content
    const img = new Image();
    const newBackdropUrl = content?.backdrop_path 
      ? `https://image.tmdb.org/t/p/original${content.backdrop_path}`
      : 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&h=600&q=80';
    
    img.src = newBackdropUrl;
    
    img.onload = () => {
      // Image is loaded, now update the displayed content and show it
      setTimeout(() => {
        setDisplayedContent(content); // Update the content being displayed
        setImageKey(prev => prev + 1); // Force background image update
        setIsLoaded(true);
        setIsTransitioning(false);
      }, 300); // Small delay for smooth transition
    };
    
    img.onerror = () => {
      // Even if image fails, update content after delay
      setTimeout(() => {
        setDisplayedContent(content);
        setImageKey(prev => prev + 1);
        setIsLoaded(true);
        setIsTransitioning(false);
      }, 300);
    };
    
    // Fallback timer in case image takes too long
    const fallbackTimer = setTimeout(() => {
      setDisplayedContent(content);
      setImageKey(prev => prev + 1);
      setIsLoaded(true);
      setIsTransitioning(false);
    }, 2000);
    
    return () => clearTimeout(fallbackTimer);
  }, [content, displayedContent]);

  // Fetch TMDB title logo for the displayed content
  useEffect(() => {
    let cancelled = false;
    async function fetchLogo() {
      try {
        if (!displayedContent?.id) {
          setLogoPath(null);
          return;
        }
        if (isTVShow(displayedContent)) {
          const logos = await getTVLogos(displayedContent.id);
          const best = pickBestLogo(logos);
          if (!cancelled) setLogoPath(best ? `https://image.tmdb.org/t/p/original${best.file_path}` : null);
        } else {
          const logos = await getMovieLogos(displayedContent.id);
          const best = pickBestLogo(logos);
          if (!cancelled) setLogoPath(best ? `https://image.tmdb.org/t/p/original${best.file_path}` : null);
        }
      } catch (e) {
        if (!cancelled) setLogoPath(null);
      }
    }
    fetchLogo();
    return () => { cancelled = true; };
  }, [displayedContent]);

  // Check if mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Parallax scroll effect — background moves slower than content
  // Use a ref to write directly to the DOM, with CSS transition for silky smoothness
  const parallaxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let rafId: number | null = null;
    const handleScroll = () => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        if (parallaxRef.current) {
          parallaxRef.current.style.transform = `translate3d(0, ${window.scrollY * 0.25}px, 0) scale(1.05)`;
        }
        rafId = null;
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, []);
  
  // Check if content is a TV show
  const isTVShow = (content: Movie | TVShow): content is TVShow => {
    return 'name' in content && 'first_air_date' in content;
  };

  // Get backdrop URL
  const backdropUrl = useMemo(() => {
    if (displayedContent?.backdrop_path) {
      return `https://image.tmdb.org/t/p/original${displayedContent.backdrop_path}`;
    }
    return 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&h=600&q=80';
  }, [displayedContent]);
  
  // Get title (movie or TV show)
  const title = useMemo(() => {
    if (isTVShow(displayedContent)) {
      return displayedContent.name;
    }
    return displayedContent?.title;
  }, [displayedContent]);

  // Get release year
  const releaseYear = useMemo(() => {
    if (isTVShow(displayedContent) && displayedContent?.first_air_date) {
      return new Date(displayedContent.first_air_date).getFullYear();
    } else if (!isTVShow(displayedContent) && displayedContent?.release_date) {
      return new Date(displayedContent.release_date).getFullYear();
    }
    return '';
  }, [displayedContent]);
  
  // Truncate overview for better display
  const truncatedOverview = useMemo(() => {
    if (displayedContent?.overview && displayedContent.overview.length > 200) {
      return displayedContent.overview.substring(0, 200) + '...';
    }
    return displayedContent?.overview || '';
  }, [displayedContent]);

  return (
    <section 
      className="relative w-full overflow-hidden"
      style={{ 
        height: isMobile ? 'calc(92vh - 70px)' : '100vh',
        maxWidth: '100vw',
      }}
    >
      {/* Background image with parallax scroll effect */}
      <div 
        ref={parallaxRef}
        key={imageKey}
        className={`absolute pointer-events-none bg-cover bg-center ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ 
          inset: '-15%',
          backgroundImage: `url('${backdropUrl}')`,
          transition: 'opacity 0.8s cubic-bezier(0.4, 0, 0.2, 1), transform 0.15s linear',
          transform: 'translate3d(0, 0, 0) scale(1.05)',
          willChange: 'transform',
        }}
      >
        {/* Static overlay without hover effects */}
        <div className="absolute inset-0 bg-black opacity-40"></div>
      </div>
      
      {/* Loading fade-in animation with transition support */}
      <div 
        className={`absolute inset-0 bg-black transition-opacity duration-600 ${isLoaded && !isTransitioning ? 'opacity-0' : 'opacity-100'}`}
      ></div>
      
      {/* Gradient overlay with animated subtle glow */}
      <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-black/50">
        <div className={`absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-background to-transparent opacity-100`}></div>
      </div>
      
      {/* Animated particles effect (subtle) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full opacity-0 animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 10}s`,
              animationDuration: `${Math.random() * 10 + 15}s`
            }}
          ></div>
        ))}
      </div>
      
      {/* Content with smooth staggered animations and interactive hover */}
      <div 
        className={`relative container mx-auto h-full flex flex-col justify-end px-4 pb-32 md:pb-24 pt-16 md:pt-20 ${isLoaded && !isTransitioning ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
        style={{
          transition: 'all 0.7s cubic-bezier(0.4, 0, 0.2, 1)'
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="max-w-xl mt-4 md:mt-10">
          {/* Badge row with smooth slide-in animation */}
          <div 
            className={`flex items-center space-x-2 mb-2 delay-100 ${isLoaded && !isTransitioning ? 'translate-x-0 opacity-100' : 'translate-x-10 opacity-0'}`} 
            style={{ 
              textShadow: '0 1px 3px rgba(0,0,0,0.8)',
              transition: 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
          >
            {isLoaded && !isTransitioning && (
              <>
                <div className="flex items-center bg-black/40 rounded-md px-2 py-1 backdrop-blur-sm">
                  <Star className="text-yellow-500 h-4 w-4 mr-1" />
                  <span className="text-primary font-bold">{Math.round(displayedContent?.vote_average * 10)}% Match</span>
                </div>
                
                {/* Content type badge (Movie or TV Show) */}
                <span className="bg-primary/70 backdrop-blur-sm border border-primary px-2 py-0.5 text-xs rounded">
                  {isTVShow(displayedContent) ? 'TV SHOW' : 'MOVIE'}
                </span>
                
                {(!isTVShow(displayedContent) && displayedContent?.adult) ? (
                  <span className="bg-red-800/70 backdrop-blur-sm border border-red-700 px-2 py-0.5 text-xs rounded">R</span>
                ) : (
                  <span className="bg-gray-800/70 backdrop-blur-sm border border-gray-700 px-2 py-0.5 text-xs rounded">PG-13</span>
                )}
                
                <span className="bg-black/30 backdrop-blur-sm px-2 py-0.5 rounded text-sm">{releaseYear}</span>
                
                <span className="bg-black/30 backdrop-blur-sm border border-gray-700 px-2 py-0.5 text-xs rounded">HD</span>
              </>
            )}
          </div>
          
          {/* Title or TMDB logo image */}
          <div
            className={`mb-4 delay-200 ${isLoaded && !isTransitioning ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}
            style={{
              textShadow: '0 2px 10px rgba(0,0,0,0.7)',
              transition: 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
          >
            {logoPath ? (
              <img
                src={logoPath}
                alt={title || 'Title Logo'}
                className="max-w-[60%] md:max-w-[60%] h-auto max-h-[60px] md:max-h-none drop-shadow-[0_4px_24px_rgba(0,0,0,0.6)]"
              />
            ) : (
              <h1 className="text-2xl md:text-6xl font-bold">{isLoaded && !isTransitioning ? title : ''}</h1>
            )}
          </div>
          
          {/* Description with smooth fade-in animation */}
          <p 
            className={`text-sm md:text-lg mb-4 md:mb-8 delay-300 ${isLoaded && !isTransitioning ? 'translate-y-0 opacity-90' : 'translate-y-4 opacity-0'}`}
            style={{
              maxWidth: '700px',
              lineHeight: '1.6',
              textShadow: '0 1px 4px rgba(0,0,0,0.9)',
              transition: 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
          >
            {isLoaded && !isTransitioning ? truncatedOverview : ''}
          </p>
          
          {/* Actions */}
          <div 
            className={`flex space-x-4 delay-400 ${isLoaded && !isTransitioning ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}
            style={{
              transition: 'all 0.9s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
          >
            <button
              type="button"
              onClick={() => navigate(isTVShow(displayedContent) ? `/tv/${displayedContent.id}` : `/movie/${displayedContent.id}`)}
              className={
                `inline-flex items-center gap-2 rounded-lg px-5 md:px-6 py-2.5 md:py-3 text-sm md:text-base
                 bg-red-600 text-white font-medium
                 hover:bg-red-700 active:bg-red-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50
                 transition-colors duration-200`
              }
            >
              <Play className="h-4 w-4 fill-current" />
              <span>Play</span>
            </button>

            <button
              type="button"
              onClick={() => navigate(isTVShow(displayedContent) ? `/tv/${displayedContent.id}` : `/movie/${displayedContent.id}`)}
              className={
                `inline-flex items-center gap-2 rounded-lg px-5 md:px-6 py-2.5 md:py-3 text-sm md:text-base
                 bg-white/10 text-white border border-white/20 backdrop-blur-sm font-medium
                 hover:bg-white/20 active:bg-white/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30
                 transition-colors duration-200`
              }
            >
              <Info className="h-4 w-4" />
              <span>More Info</span>
            </button>
          </div>
        </div>
      </div>
      
      {/* Navigation arrows */}
      {onNext && onPrevious && totalItems > 1 && (
        <>
          {/* Previous button */}
          <button
            onClick={onPrevious}
            className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 z-10 bg-black/40 hover:bg-black/60 backdrop-blur-sm border border-white/10 rounded-full p-2 md:p-3 transition-all duration-200 hover:scale-110"
          >
            <ChevronLeft className="h-4 w-4 md:h-5 md:w-5 text-white/80 hover:text-white" />
          </button>

          {/* Next button */}
          <button
            onClick={onNext}
            className="absolute right-3 md:right-4 top-1/2 -translate-y-1/2 z-10 bg-black/40 hover:bg-black/60 backdrop-blur-sm border border-white/10 rounded-full p-2 md:p-3 transition-all duration-200 hover:scale-110"
          >
            <ChevronRight className="h-4 w-4 md:h-5 md:w-5 text-white/80 hover:text-white" />
          </button>

          {/* Slide indicators — horizontal pills centered */}
          <div className="absolute bottom-6 md:bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-row items-center gap-2 mb-12 md:mb-0">
            {Array.from({ length: totalItems }).map((_, index) => (
              <button
                key={index}
                onClick={() => onIndicatorClick?.(index)}
                className={`h-2 rounded-full transition-all duration-500 ${
                  index === currentIndex
                    ? 'w-8 bg-red-600'
                    : 'w-2 bg-white/30 hover:bg-white/60'
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </>
      )}

      {/* Bottom reflection/glow effect */}
      <div 
        className={`absolute left-0 right-0 bottom-0 h-1 bg-gradient-to-r from-red-600/0 via-red-600/30 to-red-600/0 transition-opacity duration-1000 ${isHovered ? 'opacity-100' : 'opacity-0'}`}
      ></div>
    </section>
  );
};

// Add custom animation styles
const style = document.createElement('style');
style.textContent = `
  @keyframes float {
    0%, 100% {
      transform: translateY(0);
      opacity: 0;
    }
    10%, 90% {
      opacity: 0.2;
    }
    50% {
      transform: translateY(-30vh);
      opacity: 0.3;
    }
  }
  
  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateX(20px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
  
  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(30px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  @keyframes gentlePulse {
    0%, 100% {
      transform: scale(1);
      opacity: 0.3;
    }
    50% {
      transform: scale(1.4);
      opacity: 0.1;
    }
  }
  
  .animate-float {
    animation: float linear infinite;
  }
  
  .animate-slide-in {
    animation: slideIn 0.8s cubic-bezier(0.4, 0, 0.2, 1) forwards;
  }
  
  .animate-fade-in-up {
    animation: fadeInUp 0.6s cubic-bezier(0.4, 0, 0.2, 1) forwards;
  }
  
  .text-shadow-lg {
    text-shadow: 0 2px 8px rgba(0, 0, 0, 0.7);
  }
  
  .hero-gradient {
    background: linear-gradient(to top, var(--background), transparent);
  }
  
  .hero-transition {
    transition: all 0.8s cubic-bezier(0.4, 0, 0.2, 1);
  }
  
  /* Improved button hover effects */
  .hero-button {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }
  
  .hero-button:hover {
    transform: scale(1.05);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.4);
  }
`;
document.head.appendChild(style);

export default HeroBanner;

