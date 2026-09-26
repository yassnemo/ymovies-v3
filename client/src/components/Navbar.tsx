import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import type { User as UserType } from "@/hooks/useAuth";
import { useThemeContext } from "@/components/ui/theme-provider";
import { SearchIcon, User as UserIcon, ChevronDown, ChevronRight, Moon, Sun, X, Bell, Film, Tv, Home, Heart, Download, Menu, Settings as SettingsIcon, LogOut } from "lucide-react";
import NavAuthButton from "@/components/NavAuthButton";
import { Button } from "@/components/ui/button";
import SearchSuggestions from "@/components/SearchSuggestions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from "@/components/ui/navigation-menu";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const Navbar = () => {
  const [location] = useLocation();
  const { user, isAuthenticated, signOut } = useAuth();
  const { theme, setTheme } = useThemeContext();
  const [scrolled, setScrolled] = useState(false);
  const [searchActive, setSearchActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const prevScrollY = useRef(0);
  const [navVisible, setNavVisible] = useState(true);

  // Handle navbar background when scrolling and hide/show navbar on scroll direction
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // Determine if we should show or hide the navbar based on scroll direction
      if (currentScrollY > prevScrollY.current && currentScrollY > 100) {
        setNavVisible(false); // Scrolling down & past threshold - hide navbar
      } else {
        setNavVisible(true); // Scrolling up - show navbar
      }
      
      // Update background opacity based on scroll position
      if (currentScrollY > 50) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
      
      prevScrollY.current = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  // Focus search input when search is activated
  useEffect(() => {
    if (searchActive && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [searchActive]);

  // Handle search form submission
  const [, navigate] = useLocation();
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchActive(false); // Close the search input after submitting
    }
  };

  // Toggle search with animation
  const toggleSearch = () => {
    if (searchActive) {
      setSearchQuery("");
    }
    setSearchActive(!searchActive);
    
    // Focus the search input when activated
    if (!searchActive) {
      setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
      }, 100);
    }
  };

  return (
    <nav 
      className={`fixed top-0 w-full z-50 px-4 py-2 transition-all duration-300 
        ${scrolled || searchActive ? "bg-background shadow-lg" : "bg-gradient-to-b from-black/80 to-transparent"}
        ${navVisible ? "translate-y-0" : "-translate-y-full"}`}
    >
      <div className="container mx-auto flex items-center justify-between">
        {/* Logo and Navigation - Hide on mobile when search is active */}
        <div className={`flex items-center transition-all duration-300 ${searchActive ? 'md:flex hidden' : 'flex'}`}>
          <Link href="/home" className="group relative mr-6 md:mr-10 ml-2 md:ml-10 w-15 h-9 md:w-30 md:h-30">
            <div className="flex items-center">
              <img
                src="/logo.png"
                alt="YMovies"
                className="block h-12 md:h-12 w-auto select-none shrink-0"
              />
            </div>
          </Link>
          
          {/* Desktop Navigation */}
          <NavigationMenu className="hidden md:flex">
            <NavigationMenuList className="flex space-x-1">
              {/* Home */}
              <NavigationMenuItem>
                <NavigationMenuLink asChild>
                  <Link href="/home"
                    className={`px-4 py-2 text-sm font-medium relative overflow-hidden transition-colors duration-300
                      ${location === "/home" ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                    onMouseEnter={(e) => {
                      const underline = e.currentTarget.querySelector('.hover-underline') as HTMLElement;
                      if (underline && location !== "/home") {
                        underline.style.width = '100%';
                        underline.style.left = '0%';
                      }
                    }}
                    onMouseLeave={(e) => {
                      const underline = e.currentTarget.querySelector('.hover-underline') as HTMLElement;
                      if (underline && location !== "/home") {
                        underline.style.width = '0%';
                        underline.style.left = '0%';
                      }
                    }}
                  >
                    <span className="relative z-10">Home</span>
                    {location === "/home" ? (
                      <span className="absolute bottom-0 left-0 w-full h-0.5 bg-red-600"></span>
                    ) : (
                      <span className="hover-underline absolute bottom-0 left-0 w-0 h-0.5 bg-red-600 transition-all duration-300 origin-left" 
                            style={{width: '0%'}}></span>
                    )}
                  </Link>
                </NavigationMenuLink>
              </NavigationMenuItem>
              
              {/* Movies */}
              <NavigationMenuItem>
                <NavigationMenuLink asChild>
                  <Link href="/movies"
                    className={`px-4 py-2 text-sm font-medium relative overflow-hidden transition-colors duration-300
                      ${location.startsWith("/movies") && !location.includes("/movie/") ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                    onMouseEnter={(e) => {
                      const underline = e.currentTarget.querySelector('.hover-underline') as HTMLElement;
                      if (underline && !(location.startsWith("/movies") && !location.includes("/movie/"))) {
                        underline.style.width = '100%';
                        underline.style.left = '0%';
                      }
                    }}
                    onMouseLeave={(e) => {
                      const underline = e.currentTarget.querySelector('.hover-underline') as HTMLElement;
                      if (underline && !(location.startsWith("/movies") && !location.includes("/movie/"))) {
                        underline.style.width = '0%';
                        underline.style.left = '0%';
                      }
                    }}
                  >
                    <span className="relative z-10">Movies</span>
                    {location.startsWith("/movies") && !location.includes("/movie/") ? (
                      <span className="absolute bottom-0 left-0 w-full h-0.5 bg-red-600"></span>
                    ) : (
                      <span className="hover-underline absolute bottom-0 left-0 w-0 h-0.5 bg-red-600 transition-all duration-300 origin-left"></span>
                    )}
                  </Link>
                </NavigationMenuLink>
              </NavigationMenuItem>

              {/* TV Shows */}
              <NavigationMenuItem>
                <NavigationMenuLink asChild>
                  <Link href="/tv"
                    className={`px-4 py-2 text-sm font-medium relative overflow-hidden transition-colors duration-300
                      ${location.startsWith("/tv") && !location.includes("/tv/") ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                    onMouseEnter={(e) => {
                      const underline = e.currentTarget.querySelector('.hover-underline') as HTMLElement;
                      if (underline && !(location.startsWith("/tv") && !location.includes("/tv/"))) {
                        underline.style.width = '100%';
                        underline.style.left = '0%';
                      }
                    }}
                    onMouseLeave={(e) => {
                      const underline = e.currentTarget.querySelector('.hover-underline') as HTMLElement;
                      if (underline && !(location.startsWith("/tv") && !location.includes("/tv/"))) {
                        underline.style.width = '0%';
                        underline.style.left = '0%';
                      }
                    }}
                  >
                    <span className="relative z-10">TV Shows</span>
                    {location.startsWith("/tv") && !location.includes("/tv/") ? (
                      <span className="absolute bottom-0 left-0 w-full h-0.5 bg-red-600"></span>
                    ) : (
                      <span className="hover-underline absolute bottom-0 left-0 w-0 h-0.5 bg-red-600 transition-all duration-300 origin-left"></span>
                    )}
                  </Link>
                </NavigationMenuLink>
              </NavigationMenuItem>
              
              {/* Search */}
              <NavigationMenuItem>
                <NavigationMenuLink asChild>
                  <Link href="/search"
                    className={`px-4 py-2 text-sm font-medium relative overflow-hidden transition-colors duration-300
                      ${location.startsWith("/search") ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                    onMouseEnter={(e) => {
                      const underline = e.currentTarget.querySelector('.hover-underline') as HTMLElement;
                      if (underline && !location.startsWith("/search")) {
                        underline.style.width = '100%';
                        underline.style.left = '0%';
                      }
                    }}
                    onMouseLeave={(e) => {
                      const underline = e.currentTarget.querySelector('.hover-underline') as HTMLElement;
                      if (underline && !location.startsWith("/search")) {
                        underline.style.width = '0%';
                        underline.style.left = '0%';
                      }
                    }}
                  >
                    <span className="relative z-10">Search</span>
                    {location.startsWith("/search") ? (
                      <span className="absolute bottom-0 left-0 w-full h-0.5 bg-red-600"></span>
                    ) : (
                      <span className="hover-underline absolute bottom-0 left-0 w-0 h-0.5 bg-red-600 transition-all duration-300 origin-left"></span>
                    )}
                  </Link>
                </NavigationMenuLink>
              </NavigationMenuItem>
              
              {/* Browse (dropdown menu for categories) */}
              <NavigationMenuItem>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button 
                      className={`inline-flex items-center px-4 py-2 text-sm font-medium relative overflow-hidden transition-colors duration-300 bg-transparent border-none cursor-pointer ${location.startsWith("/genre") ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                      onMouseEnter={(e) => {
                        const underline = e.currentTarget.querySelector('.hover-underline') as HTMLElement;
                        if (underline && !location.startsWith("/genre")) {
                          underline.style.width = '100%';
                          underline.style.left = '0%';
                        }
                      }}
                      onMouseLeave={(e) => {
                        const underline = e.currentTarget.querySelector('.hover-underline') as HTMLElement;
                        if (underline && !location.startsWith("/genre")) {
                          underline.style.width = '0%';
                          underline.style.left = '0%';
                        }
                      }}
                    >
                      <span className="relative z-10">Browse</span>
                      <ChevronDown className={`ml-1 h-3 w-3 transition-transform duration-200 ${menuOpen ? 'rotate-180' : ''}`} />
                      {location.startsWith("/genre") ? (
                        <span className="absolute bottom-0 left-0 w-full h-0.5 bg-red-600"></span>
                      ) : (
                        <span className="hover-underline absolute bottom-0 left-0 w-0 h-0.5 bg-red-600 transition-all duration-300 origin-left"></span>
                      )}
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-64 animate-in slide-in-from-top-5 fade-in-50">
                    <div className="p-2">
                      <div className="flex items-center mb-1">
                        <Film className="h-4 w-4 mr-2 text-red-500" />
                        <span className="text-xs font-semibold uppercase text-muted-foreground">Movies</span>
                      </div>
                      <div className="grid grid-cols-2 gap-1">
                        <DropdownMenuItem asChild className="hover:bg-gray-800/50 hover:text-red-500 transition-colors">
                          <Link href="/genre/movie/action">Action</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild className="hover:bg-gray-800/50 hover:text-red-500 transition-colors">
                          <Link href="/genre/movie/comedy">Comedy</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild className="hover:bg-gray-800/50 hover:text-red-500 transition-colors">
                          <Link href="/genre/movie/drama">Drama</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild className="hover:bg-gray-800/50 hover:text-red-500 transition-colors">
                          <Link href="/genre/movie/horror">Horror</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild className="hover:bg-gray-800/50 hover:text-red-500 transition-colors">
                          <Link href="/genre/movie/scifi">Sci-Fi</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild className="hover:bg-gray-800/50 hover:text-red-500 transition-colors">
                          <Link href="/genre/movie/thriller">Thriller</Link>
                        </DropdownMenuItem>
                      </div>
                    </div>
                    <DropdownMenuSeparator />
                    <div className="p-2">
                      <div className="flex items-center mb-1">
                        <Tv className="h-4 w-4 mr-2 text-red-500" />
                        <span className="text-xs font-semibold uppercase text-muted-foreground">TV Shows</span>
                      </div>
                      <div className="grid grid-cols-2 gap-1">
                        <DropdownMenuItem asChild className="hover:bg-gray-800/50 hover:text-red-500 transition-colors">
                          <Link href="/genre/tv/action">Action</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild className="hover:bg-gray-800/50 hover:text-red-500 transition-colors">
                          <Link href="/genre/tv/comedy">Comedy</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild className="hover:bg-gray-800/50 hover:text-red-500 transition-colors">
                          <Link href="/genre/tv/drama">Drama</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild className="hover:bg-gray-800/50 hover:text-red-500 transition-colors">
                          <Link href="/genre/tv/crime">Crime</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild className="hover:bg-gray-800/50 hover:text-red-500 transition-colors">
                          <Link href="/genre/tv/documentary">Documentary</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild className="hover:bg-gray-800/50 hover:text-red-500 transition-colors">
                          <Link href="/genre/tv/anime">Anime</Link>
                        </DropdownMenuItem>
                      </div>
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>
              </NavigationMenuItem>
              
              {/* My List (authenticated users only) */}
              {isAuthenticated && (
                <NavigationMenuItem>
                  <NavigationMenuLink asChild>
                    <Link href="/my-list"
                      className={`px-4 py-2 text-sm font-medium relative overflow-hidden transition-colors duration-300
                        ${location === "/my-list" ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                      onMouseEnter={(e) => {
                        const underline = e.currentTarget.querySelector('.hover-underline') as HTMLElement;
                        if (underline && location !== "/my-list") {
                          underline.style.width = '100%';
                          underline.style.left = '0%';
                        }
                      }}
                      onMouseLeave={(e) => {
                        const underline = e.currentTarget.querySelector('.hover-underline') as HTMLElement;
                        if (underline && location !== "/my-list") {
                          underline.style.width = '0%';
                          underline.style.left = '0%';
                        }
                      }}
                    >
                      <span className="relative z-10">My List</span>
                      {location === "/my-list" ? (
                        <span className="absolute bottom-0 left-0 w-full h-0.5 bg-red-600"></span>
                      ) : (
                        <span className="hover-underline absolute bottom-0 left-0 w-0 h-0.5 bg-red-600 transition-all duration-300 origin-left"></span>
                      )}
                    </Link>
                  </NavigationMenuLink>
                </NavigationMenuItem>
              )}
            </NavigationMenuList>
          </NavigationMenu>
        </div>
        
        {/* Right Side Elements - Hide on mobile when search is active except search itself */}
        <div className={`flex items-center space-x-4 mr-2 md:mr-10 transition-all duration-300 ${searchActive ? 'w-full md:w-auto justify-center md:justify-end mr-0' : ''}`}>
          {/* Search Input & Button */}
          <div className={`relative ${searchActive ? 'w-full md:w-auto' : ''}`}>
            {searchActive ? (
              <form onSubmit={handleSearchSubmit} className="flex items-center w-full">
                <div className="relative w-full md:w-auto">
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search movies, TV shows, actors..."
                    className="w-full md:w-72 lg:w-96 pl-10 pr-4 py-3 md:py-2 bg-black/70 backdrop-blur-sm border border-gray-600/50 rounded-xl text-sm md:text-sm focus:outline-none focus:ring-2 focus:border-red-500 focus:ring-red-500/30 transition-all animate-in fade-in-0 slide-in-from-right-5 shadow-lg"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 md:h-4 md:w-4 text-muted-foreground" />
                  
                  {/* Search Suggestions */}
                  <SearchSuggestions 
                    query={searchQuery}
                    onItemClick={() => {
                      setSearchActive(false);
                      setSearchQuery('');
                    }}
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={toggleSearch}
                  className="ml-2 hover:bg-gray-800/50 transition-colors rounded-xl flex-shrink-0"
                  aria-label="Close search"
                >
                  <X className="h-5 w-5 md:h-4 md:w-4 hover:text-red-500 transition-colors" />
                </Button>
              </form>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                aria-label="Search"
                onClick={toggleSearch}
                className="rounded-full hover:bg-gray-800/50 transition-transform hover:scale-110 duration-200"
              >
                <SearchIcon className="h-5 w-5 hover:text-red-500 transition-colors" />
              </Button>
            )}
          </div>
          
          {/* Notifications (authenticated users only) - Hide on mobile when search is active */}
          {isAuthenticated && (
            <div className={`${searchActive ? 'hidden md:block' : 'block'}`}>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Notifications"
                    className="rounded-full hover:bg-gray-800/50 transition-transform hover:scale-110 duration-200 relative"
                  >
                    <Bell className="h-5 w-5 hover:text-red-500 transition-colors" />
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-600 rounded-full animate-pulse"></span>
                  </Button>
                </PopoverTrigger>
              <PopoverContent 
                side="bottom" 
                className="w-80 p-0 bg-background border border-border shadow-lg"
              >
                <div className="px-4 py-3 border-b border-border">
                  <h4 className="font-semibold text-sm text-foreground">Notifications</h4>
                </div>
                <div className="px-4 py-4">
                  <div className="flex gap-3">
                    <div className="w-2 h-2 bg-red-500 rounded-full mt-1.5 shrink-0"></div>
                    <div className="space-y-1">
                      <p className="text-sm text-foreground font-medium">Welcome to YMovies</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Your account is set up. Browse movies and TV shows, build your watchlist, and get personalized recommendations.
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">Just now</p>
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            </div>
          )}
          
          {/* User Menu or Sign In Button - Hide on mobile when search is active */}
          {isAuthenticated ? (
            <div className={`${searchActive ? 'hidden md:block' : 'block'}`}>
              <DropdownMenu onOpenChange={setMenuOpen}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center space-x-2 hover:bg-gray-800/50 transition-colors p-1 rounded-full">
                  <Avatar className="h-8 w-8 border-2 border-transparent hover:border-red-600 transition-colors">
                    <AvatarImage 
                      src={user?.profileImageUrl || ""} 
                      alt={user?.firstName || "User"} 
                      className="object-cover"
                    />
                    <AvatarFallback className="bg-gray-800 text-red-500">{user?.firstName?.[0] || "U"}</AvatarFallback>
                  </Avatar>
                  <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${menuOpen ? 'rotate-180' : ''}`} />
                </Button>
              </DropdownMenuTrigger>
              
              <DropdownMenuContent align="end" className="w-48 animate-in slide-in-from-top-5 fade-in-50">
                <div className="px-2 py-1.5 text-sm font-medium text-muted-foreground">
                  {user?.email}
                </div>
                <DropdownMenuSeparator />
                
                <DropdownMenuItem asChild className="hover:bg-gray-800/50 hover:text-red-500 transition-colors">
                  <Link href="/profile" className="flex items-center">
                    <UserIcon className="mr-2 h-4 w-4" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                
                <DropdownMenuItem asChild className="hover:bg-gray-800/50 hover:text-red-500 transition-colors">
                  <Link href="/my-list" className="flex items-center">
                    <svg className="mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                      <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
                      <path d="m9 14 2 2 4-4"></path>
                    </svg>
                    My List
                  </Link>
                </DropdownMenuItem>
                
                <DropdownMenuItem asChild className="hover:bg-gray-800/50 hover:text-red-500 transition-colors">
                  <Link href="/settings" className="flex items-center">
                    <svg className="mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                    Settings
                  </Link>
                </DropdownMenuItem>
                
                <DropdownMenuSeparator />
                
                <DropdownMenuItem 
                  onClick={async () => {
                    await signOut();
                    navigate("/");
                  }} 
                  className="hover:bg-gray-800/50 text-red-500 hover:text-red-400 transition-colors flex items-center"
                >
                  <svg className="mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                    <polyline points="16 17 21 12 16 7"></polyline>
                    <line x1="21" y1="12" x2="9" y2="12"></line>
                  </svg>
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            </div>
          ) : (
            <div className={`${searchActive ? 'hidden md:block' : 'block'}`}>
              <NavAuthButton />
            </div>
          )}
        </div>
      </div>
      
      {/* Bottom red glow line - appears stronger when scrolled */}
      <div className={`absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-red-600/50 to-transparent transition-opacity duration-300 ${scrolled ? 'opacity-100' : 'opacity-0'}`}></div>
    </nav>
  );
};

// Mobile Bottom Navigation Component
const MobileBottomNav = () => {
  const [location, navigate] = useLocation();
  const { isAuthenticated, signOut } = useAuth();
  const [browseMenuOpen, setBrowseMenuOpen] = useState(false);
  const [browseCategory, setBrowseCategory] = useState<"movie" | "tv">("movie");
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const browseActive = location.startsWith("/genre") || location === "/movies" || location.startsWith("/tv");

  useEffect(() => {
    if (!browseMenuOpen && !profileMenuOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setBrowseMenuOpen(false);
        setProfileMenuOpen(false);
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [browseMenuOpen, profileMenuOpen]);

  const browseGenres = {
    movie: [
      { name: "Action", path: "/genre/movie/action" },
      { name: "Comedy", path: "/genre/movie/comedy" },
      { name: "Drama", path: "/genre/movie/drama" },
      { name: "Horror", path: "/genre/movie/horror" },
      { name: "Sci-Fi", path: "/genre/movie/scifi" },
      { name: "Thriller", path: "/genre/movie/thriller" },
    ],
    tv: [
      { name: "Action", path: "/genre/tv/action" },
      { name: "Comedy", path: "/genre/tv/comedy" },
      { name: "Drama", path: "/genre/tv/drama" },
      { name: "Crime", path: "/genre/tv/crime" },
      { name: "Documentary", path: "/genre/tv/documentary" },
      { name: "Anime", path: "/genre/tv/anime" },
    ],
  };

  const isActive = (path: string) => {
    if (path === '/home' && location === '/home') return true;
    if (path !== '/home' && path !== '/' && location.startsWith(path)) return true;
    return false;
  };

  // Shared tab styling — frosted "selected" chip when active, subtle press feedback otherwise
  const tabClass = (active: boolean) =>
    `relative flex flex-col items-center justify-center gap-0.5 rounded-2xl py-1.5 px-2 min-w-0 flex-1 transition-all duration-300 ${
      active
        ? 'text-red-500 bg-white/10'
        : 'text-gray-300 hover:text-white active:scale-90'
    }`;

  return (
    <>
      {/* Mobile Bottom Navigation — floating liquid-glass bar */}
      <nav className="md:hidden fixed inset-x-0 bottom-0 z-50 px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-2 pointer-events-none">
        <div className="pointer-events-auto relative mx-auto flex max-w-md items-center justify-around gap-1 rounded-[26px] border border-white/15 bg-black/40 px-2 py-1.5 shadow-[0_8px_40px_rgba(0,0,0,0.55)] backdrop-blur-2xl backdrop-saturate-150 [box-shadow:0_8px_40px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.12)]">
          {/* Glass top-edge highlight */}
          <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent"></div>

          {/* Home */}
          <Link href="/home" className={tabClass(isActive('/home'))}>
            <Home className={`h-5 w-5 transition-transform duration-300 ${isActive('/home') ? 'scale-110' : ''}`} />
            <span className="text-[10px] font-medium leading-none">Home</span>
          </Link>

          {/* Browse */}
          <button onClick={() => {
            setBrowseCategory(location.startsWith("/tv") || location.startsWith("/genre/tv") ? "tv" : "movie");
            setBrowseMenuOpen(true);
          }} className={tabClass(browseActive)}>
            <Menu className={`h-5 w-5 transition-transform duration-300 ${browseActive ? 'scale-110' : ''}`} />
            <span className="text-[10px] font-medium leading-none">Browse</span>
          </button>

          {/* Search */}
          <Link href="/search" className={tabClass(isActive('/search'))}>
            <SearchIcon className={`h-5 w-5 transition-transform duration-300 ${isActive('/search') ? 'scale-110' : ''}`} />
            <span className="text-[10px] font-medium leading-none">Search</span>
          </Link>

          {/* Fourth Tab: My List or Sign In */}
          {isAuthenticated ? (
            <Link href="/my-list" className={tabClass(isActive('/my-list'))}>
              <Heart className={`h-5 w-5 transition-transform duration-300 ${isActive('/my-list') ? 'scale-110' : ''}`} />
              <span className="text-[10px] font-medium leading-none">My List</span>
            </Link>
          ) : (
            <Link href="/signin" className={tabClass(isActive('/signin'))}>
              <UserIcon className={`h-5 w-5 transition-transform duration-300 ${isActive('/signin') ? 'scale-110' : ''}`} />
              <span className="text-[10px] font-medium leading-none">Sign In</span>
            </Link>
          )}

          {/* Fifth Tab: Profile/More (authenticated only) */}
          {isAuthenticated && (
            <button
              onClick={() => setProfileMenuOpen(true)}
              className={tabClass(location.startsWith('/profile') || location.startsWith('/settings'))}
            >
              <UserIcon className={`h-5 w-5 transition-transform duration-300 ${location.startsWith('/profile') || location.startsWith('/settings') ? 'scale-110' : ''}`} />
              <span className="text-[10px] font-medium leading-none">More</span>
            </button>
          )}
        </div>
      </nav>

      {/* Browse Menu Modal for Mobile */}
      {browseMenuOpen && (
        <div role="dialog" aria-modal="true" aria-label="Browse" className="fixed inset-0 z-[60] bg-[#090909] text-white md:hidden">
          <div className="flex h-[100dvh] flex-col">
            <div className="flex items-center justify-between px-5 pb-5 pt-[calc(env(safe-area-inset-top)+1.5rem)]">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-400">Explore</p>
                <h2 className="mt-1 text-3xl font-semibold tracking-tight">Browse</h2>
              </div>
              <button
                type="button"
                onClick={() => setBrowseMenuOpen(false)}
                className="grid h-11 w-11 place-items-center rounded-full border border-white/10 bg-white/[0.06] text-gray-300 active:scale-95"
                aria-label="Close browse menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="px-5">
              <div role="tablist" aria-label="Browse media type" className="grid grid-cols-2 rounded-2xl bg-white/[0.07] p-1">
                <button
                  type="button"
                  role="tab"
                  aria-selected={browseCategory === "movie"}
                  onClick={() => setBrowseCategory("movie")}
                  className={browseCategory === "movie" ? "flex h-11 items-center justify-center gap-2 rounded-xl bg-white text-sm font-semibold text-black shadow-sm" : "flex h-11 items-center justify-center gap-2 rounded-xl text-sm font-medium text-gray-400"}
                >
                  <Film className="h-4 w-4" /> Movies
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={browseCategory === "tv"}
                  onClick={() => setBrowseCategory("tv")}
                  className={browseCategory === "tv" ? "flex h-11 items-center justify-center gap-2 rounded-xl bg-white text-sm font-semibold text-black shadow-sm" : "flex h-11 items-center justify-center gap-2 rounded-xl text-sm font-medium text-gray-400"}
                >
                  <Tv className="h-4 w-4" /> TV Shows
                </button>
              </div>
            </div>

            <div key={browseCategory} className="min-h-0 flex-1 overflow-y-auto px-5 pb-[calc(env(safe-area-inset-bottom)+2rem)]">
              <Link
                href={browseCategory === "movie" ? "/movies" : "/tv"}
                onClick={() => setBrowseMenuOpen(false)}
                className="mt-5 flex min-h-24 items-center gap-4 rounded-2xl border border-red-500/20 bg-gradient-to-br from-red-900/35 via-red-950/20 to-[#171717] p-4 active:scale-[0.99]"
              >
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-red-500/15 text-red-400">
                  {browseCategory === "movie" ? <Film className="h-6 w-6" /> : <Tv className="h-6 w-6" />}
                </div>
                <div className="min-w-0 flex-1">
                  <span className="block text-base font-semibold">{browseCategory === "movie" ? "All movies" : "All TV shows"}</span>
                  <span className="mt-0.5 block text-xs text-gray-400">Explore popular and trending picks</span>
                </div>
                <ChevronRight className="h-5 w-5 shrink-0 text-gray-400" />
              </Link>

              <div className="mb-3 mt-7 flex items-center justify-between">
                <h3 className="text-base font-semibold">Genres</h3>
                <span className="text-xs text-gray-500">Pick a mood</span>
              </div>
              <div className="space-y-2">
                {browseGenres[browseCategory].map((item) => (
                  <Link
                    key={item.path}
                    href={item.path}
                    onClick={() => setBrowseMenuOpen(false)}
                    className="flex min-h-14 items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.04] px-4 text-sm font-medium text-gray-100 transition-colors active:bg-white/10"
                  >
                    {item.name}
                    <ChevronRight className="h-4 w-4 text-gray-500" />
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Profile/More Menu Modal for Mobile */}
      {profileMenuOpen && (
        <div role="dialog" aria-modal="true" aria-label="Account" className="fixed inset-0 z-[60] bg-[#090909] text-white md:hidden">
          <div className="flex h-[100dvh] flex-col">
            {/* Header */}
            <div className="flex items-start justify-between px-5 pb-5 pt-[calc(env(safe-area-inset-top)+1.5rem)]">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-red-400">
                  <UserIcon className="h-3.5 w-3.5" />
                  Account
                </div>
                <h2 className="mt-2 text-3xl font-semibold tracking-tight">More</h2>
              </div>
              <button
                onClick={() => setProfileMenuOpen(false)}
                className="grid h-11 w-11 place-items-center rounded-full border border-white/10 bg-white/[0.06] text-gray-300 active:scale-95"
                aria-label="Close account menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-[calc(env(safe-area-inset-bottom)+2rem)]">
              <div className="space-y-3">
                {[
                  { label: 'Profile', icon: UserIcon, href: '/profile' },
                  { label: 'Settings', icon: SettingsIcon, href: '/settings' },
                ].map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setProfileMenuOpen(false)}
                    className="group relative flex items-center gap-4 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 transition-colors hover:bg-white/[0.08] active:scale-[0.98]"
                  >
                    <item.icon className="h-5 w-5 text-red-500" />
                    <span className="text-base font-medium text-white">
                      {item.label}
                    </span>
                    <ChevronRight className="ml-auto h-4 w-4 text-gray-600 transition-all duration-300 group-hover:translate-x-0.5 group-hover:text-red-500" />
                    <span className="pointer-events-none absolute -right-6 -top-6 h-16 w-16 rounded-full bg-red-600/0 blur-2xl transition-all duration-300 group-hover:bg-red-600/30" />
                  </Link>
                ))}

                <button
                  onClick={async () => {
                    await signOut();
                    setProfileMenuOpen(false);
                    navigate("/");
                  }}
                  className="group flex w-full items-center gap-4 rounded-2xl border border-red-500/20 bg-red-500/[0.06] px-4 py-4 text-red-400 transition-colors hover:bg-red-500/15 active:scale-[0.98]"
                >
                  <LogOut className="h-5 w-5" />
                  <span className="text-base font-medium">Sign Out</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const NavbarWithMobile = () => {
  return (
    <TooltipProvider>
      <Navbar />
      <MobileBottomNav />
    </TooltipProvider>
  );
};

export default NavbarWithMobile;
