import React, { useMemo, useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Movie } from "@/types/movie";
import { TVShow } from "@/types/tvshow";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Heart,
  Bookmark,
  Play,
  Grid3X3,
  List,
  Clock,
  Search,
  Star,
  Film,
  Tv,
  ChevronRight,
  Library,
} from "lucide-react";
import MediaGrid from "@/components/MediaGrid";
import MasonryMediaGrid from "@/components/MasonryMediaGrid";

type MediaItem = Movie | TVShow;

interface WatchHistoryItem {
  id: number;
  title?: string;
  name?: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date?: string;
  first_air_date?: string;
  vote_average: number;
  runtime?: number;
  watchData: {
    watchProgress: number;
    watchCount: number;
    completed: boolean;
    rating: number | null;
    lastStoppedAt: number;
    watchDuration: number;
    watchedAt: string | null;
  };
}

// Shared brand styling for the segmented tab bar
const TABS_LIST_CLASS =
  "w-max sm:w-auto h-auto bg-white/[0.03] border border-white/10 rounded-sm p-1 gap-1";
const TABS_TRIGGER_CLASS =
  "rounded-sm px-3 py-1.5 text-xs sm:text-sm text-gray-400 gap-1.5 data-[state=active]:bg-red-600 data-[state=active]:text-white data-[state=active]:shadow-none";
const FIELD_CLASS = "bg-white/5 border-white/10 text-white";

const MyList = () => {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [location] = useLocation();
  const [activeTab, setActiveTab] = useState("overview");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const {
    preferences,
    isLoading: isPreferencesLoading,
    addToFavorites,
    addToWatchlist,
    removeFromFavorites,
    removeFromWatchlist,
    createCollection,
    renameCollection,
    deleteCollection,
    removeItemFromCollection,
  } = useUserPreferences();

  const [sortBy, setSortBy] = useState<"recent" | "title" | "year" | "rating">(
    "recent",
  );
  const [typeFilter, setTypeFilter] = useState<"all" | "movie" | "tv">("all");
  const [query, setQuery] = useState("");
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const { data: watchHistory } = useQuery<WatchHistoryItem[]>({
    queryKey: ["continue-watching"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/history");
      return res.json();
    },
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 2,
  });

  const inProgress = useMemo(() => {
    if (!watchHistory) return [];
    return watchHistory
      .filter(
        (item) => item.watchData.watchProgress > 0 && !item.watchData.completed,
      )
      .sort((a, b) => {
        const dateA = a.watchData.watchedAt
          ? new Date(a.watchData.watchedAt).getTime()
          : 0;
        const dateB = b.watchData.watchedAt
          ? new Date(b.watchData.watchedAt).getTime()
          : 0;
        return dateB - dateA;
      });
  }, [watchHistory]);

  const watchProgressMap = useMemo(() => {
    const map: Record<number, number> = {};
    if (watchHistory) {
      watchHistory.forEach((item) => {
        if (item.watchData.watchProgress > 0 && !item.watchData.completed) {
          map[item.id] = item.watchData.watchProgress;
        }
      });
    }
    return map;
  }, [watchHistory]);

  useEffect(() => {
    const url = new URL(window.location.href);
    const tabParam = url.searchParams.get("tab");
    if (
      tabParam &&
      ["overview", "watching", "watchlist", "favorites", "collections"].includes(
        tabParam,
      )
    ) {
      setActiveTab(tabParam);
    }
  }, [location]);

  const watchlist = preferences?.watchlist || [];
  const favorites = preferences?.favoriteMovies || [];
  const collections = preferences?.collections || [];

  const [activeCollectionId, setActiveCollectionId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (collections.length && !activeCollectionId) {
      setActiveCollectionId(collections[0].id);
    }
  }, [collections, activeCollectionId]);

  useEffect(() => {
    setSelectedIds(new Set());
  }, [activeTab, sortBy, typeFilter, query]);

  const isTVItem = (media: MediaItem) =>
    !!(media as any).first_air_date || !!(media as any).original_name;

  const getMediaTitle = (media: MediaItem): string =>
    (media as any).title || (media as any).name || "Unknown";

  const getMediaReleaseYear = (media: MediaItem): string | null => {
    const date =
      (media as any).release_date || (media as any).first_air_date;
    return date ? new Date(date).getFullYear().toString() : null;
  };

  const getMediaPosterUrl = (media: MediaItem): string =>
    (media as any).poster_path
      ? `https://image.tmdb.org/t/p/w500${(media as any).poster_path}`
      : "https://via.placeholder.com/500x750?text=No+Poster";

  // Ambient backdrop for the hero, pulled from what you're watching / saving
  const heroBackdrop = useMemo(() => {
    const candidates: any[] = [inProgress[0], ...favorites, ...watchlist];
    const found = candidates.find((m) => m && m.backdrop_path);
    return found?.backdrop_path
      ? `https://image.tmdb.org/t/p/original${found.backdrop_path}`
      : null;
  }, [inProgress, favorites, watchlist]);

  const applyFilters = (items: MediaItem[]) => {
    let out = [...items];
    if (typeFilter !== "all") {
      out = out.filter((i) =>
        typeFilter === "tv" ? isTVItem(i) : !isTVItem(i),
      );
    }
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      out = out.filter((i) => getMediaTitle(i).toLowerCase().includes(q));
    }
    out.sort((a, b) => {
      if (sortBy === "title")
        return getMediaTitle(a).localeCompare(getMediaTitle(b));
      if (sortBy === "year") {
        return (
          Number(getMediaReleaseYear(b) || 0) -
          Number(getMediaReleaseYear(a) || 0)
        );
      }
      if (sortBy === "rating")
        return ((b as any).vote_average || 0) - ((a as any).vote_average || 0);
      return 0;
    });
    return out;
  };

  const displayWatchlist = useMemo(
    () => applyFilters(watchlist),
    [watchlist, sortBy, typeFilter, query],
  );
  const displayFavorites = useMemo(
    () => applyFilters(favorites),
    [favorites, sortBy, typeFilter, query],
  );

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllVisible = () => {
    const source =
      activeTab === "watchlist" ? displayWatchlist : displayFavorites;
    setSelectedIds(new Set(source.map((i) => i.id)));
  };

  const clearSelection = () => setSelectedIds(new Set());

  const handleRemoveFromWatchlist = (id: number) => {
    removeFromWatchlist(id);
    toast({
      title: "Removed from Watchlist",
      description: "Item removed from your watchlist.",
    });
  };

  const handleRemoveFromFavorites = (id: number) => {
    removeFromFavorites(id);
    toast({
      title: "Removed from Favorites",
      description: "Item removed from your favorites.",
    });
  };

  const bulkRemove = async () => {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;
    if (activeTab === "watchlist") {
      await Promise.all(ids.map((id) => removeFromWatchlist(id)));
      toast({
        title: "Removed",
        description: `${ids.length} item(s) removed from watchlist.`,
      });
    } else if (activeTab === "favorites") {
      await Promise.all(ids.map((id) => removeFromFavorites(id)));
      toast({
        title: "Removed",
        description: `${ids.length} item(s) removed from favorites.`,
      });
    }
    clearSelection();
  };

  const bulkAddToOther = async () => {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;
    const source = activeTab === "watchlist" ? watchlist : favorites;
    const byId = new Map(source.map((m) => [m.id, m] as const));
    if (activeTab === "watchlist") {
      await Promise.all(
        ids.map((id) => {
          const m = byId.get(id);
          if (!m) return Promise.resolve();
          const payload: any = { ...m };
          if (!payload.title && payload.name) payload.title = payload.name;
          return addToFavorites(payload);
        }),
      );
      toast({
        title: "Added to Favorites",
        description: `${ids.length} item(s) added.`,
      });
    } else if (activeTab === "favorites") {
      await Promise.all(
        ids.map((id) => {
          const m = byId.get(id);
          if (!m) return Promise.resolve();
          const payload: any = { ...m };
          if (!payload.title && payload.name) payload.title = payload.name;
          return addToWatchlist(payload);
        }),
      );
      toast({
        title: "Added to Watchlist",
        description: `${ids.length} item(s) added.`,
      });
    }
    clearSelection();
  };

  const formatTimeLeft = (progress: number, runtime?: number) => {
    if (!runtime) return `${progress}%`;
    const minutesLeft = Math.round(runtime * (1 - progress / 100));
    if (minutesLeft < 60) return `${minutesLeft}m left`;
    const h = Math.floor(minutesLeft / 60);
    const m = minutesLeft % 60;
    return `${h}h ${m}m left`;
  };

  if (isPreferencesLoading) {
    return (
      <div className="min-h-screen bg-black">
        <div className="px-6 sm:px-12 lg:px-20 pt-28 pb-12">
          <div className="max-w-7xl mx-auto">
            <Skeleton className="h-12 w-64 mb-6 bg-white/5" />
            <div className="flex gap-2 mb-8">
              {Array(5)
                .fill(0)
                .map((_, i) => (
                  <Skeleton key={i} className="h-10 w-24 bg-white/5" />
                ))}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {Array(10)
                .fill(0)
                .map((_, i) => (
                  <LoadingSkeleton key={i} variant="movie-card" />
                ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const movieCount =
    watchlist.filter((i) => !isTVItem(i)).length +
    favorites.filter((i) => !isTVItem(i)).length;
  const tvCount =
    watchlist.filter((i) => isTVItem(i)).length +
    favorites.filter((i) => isTVItem(i)).length;
  const totalItems = watchlist.length + favorites.length;

  const showFilters = activeTab === "watchlist" || activeTab === "favorites";

  return (
    <div className="min-h-screen bg-black text-white">
      {/* ===== CINEMATIC HEADER ===== */}
      <section className="relative overflow-hidden border-b border-white/5">
        {heroBackdrop ? (
          <img
            src={heroBackdrop}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover opacity-[0.16] animate-ken-burns will-change-transform"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#160505] via-black to-black" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/85 to-black/60" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-transparent to-transparent" />

        <div className="relative px-6 sm:px-12 lg:px-20 pt-28 pb-10">
          <div className="max-w-7xl mx-auto">
            <p className="text-red-500 text-xs font-semibold uppercase tracking-[0.25em] mb-4 flex items-center gap-2">
              <Library className="w-3.5 h-3.5" />
              Your Library
            </p>
            <h1 className="font-logo tracking-wide text-5xl sm:text-7xl leading-[0.9]">
              My List
            </h1>
            <p className="text-gray-400 text-sm mt-3">
              Everything you've saved, loved, and started — in one place.
            </p>

            {/* Stat ribbon */}
            <div className="mt-8 grid grid-cols-3 max-w-md gap-px overflow-hidden rounded-sm border border-white/10 bg-white/10">
              {[
                { label: "Movies", value: movieCount },
                { label: "Shows", value: tvCount },
                { label: "In Progress", value: inProgress.length },
              ].map((stat) => (
                <div key={stat.label} className="bg-[#0a0a0a] px-4 py-4 text-center">
                  <div className="font-logo text-3xl sm:text-4xl leading-none text-white">
                    {stat.value}
                  </div>
                  <div className="mt-1 text-[10px] sm:text-xs uppercase tracking-[0.2em] text-gray-500">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ===== CONTENT ===== */}
      <div className="px-6 sm:px-12 lg:px-20 py-10 pb-20">
        <div className="max-w-7xl mx-auto">
          <Tabs
            value={activeTab}
            onValueChange={(v) => {
              setActiveTab(v);
              setSelectionMode(false);
            }}
          >
            <div className="flex flex-col gap-4 mb-8">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="overflow-x-auto scrollbar-hide -mx-6 px-6 sm:mx-0 sm:px-0">
                  <TabsList className={TABS_LIST_CLASS}>
                    <TabsTrigger value="overview" className={TABS_TRIGGER_CLASS}>
                      Overview
                    </TabsTrigger>
                    <TabsTrigger value="watching" className={TABS_TRIGGER_CLASS}>
                      <Play className="w-3.5 h-3.5" />
                      <span className="hidden xs:inline">Watching</span>
                    </TabsTrigger>
                    <TabsTrigger value="watchlist" className={TABS_TRIGGER_CLASS}>
                      <Bookmark className="w-3.5 h-3.5" />
                      <span className="hidden xs:inline">Watchlist</span>
                      {watchlist.length > 0 && (
                        <span className="ml-1 text-[10px] bg-white/15 rounded-full px-1.5">
                          {watchlist.length}
                        </span>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="favorites" className={TABS_TRIGGER_CLASS}>
                      <Heart className="w-3.5 h-3.5" />
                      <span className="hidden xs:inline">Favorites</span>
                      {favorites.length > 0 && (
                        <span className="ml-1 text-[10px] bg-white/15 rounded-full px-1.5">
                          {favorites.length}
                        </span>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="collections" className={TABS_TRIGGER_CLASS}>
                      <Star className="w-3.5 h-3.5" />
                      <span className="hidden xs:inline">Collections</span>
                    </TabsTrigger>
                  </TabsList>
                </div>

                {showFilters && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant={selectionMode ? "secondary" : "outline"}
                      size="sm"
                      onClick={() => setSelectionMode(!selectionMode)}
                      className={`text-xs h-8 rounded-sm ${
                        selectionMode
                          ? ""
                          : "border-white/15 text-white hover:bg-white/10"
                      }`}
                    >
                      {selectionMode ? "Done" : "Select"}
                    </Button>
                    <div className="flex bg-white/[0.03] rounded-sm border border-white/10 p-0.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        className={`h-7 w-7 p-0 rounded-sm ${
                          viewMode === "grid"
                            ? "bg-red-600 text-white hover:bg-red-700"
                            : "text-gray-400 hover:text-white hover:bg-white/10"
                        }`}
                        onClick={() => setViewMode("grid")}
                      >
                        <Grid3X3 className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className={`h-7 w-7 p-0 rounded-sm ${
                          viewMode === "list"
                            ? "bg-red-600 text-white hover:bg-red-700"
                            : "text-gray-400 hover:text-white hover:bg-white/10"
                        }`}
                        onClick={() => setViewMode("list")}
                      >
                        <List className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {showFilters && (
                <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                  <div className="flex gap-2 flex-1">
                    <Select
                      value={typeFilter}
                      onValueChange={(v: any) => setTypeFilter(v)}
                    >
                      <SelectTrigger className={`w-[120px] h-9 text-xs rounded-sm ${FIELD_CLASS}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="movie">Movies</SelectItem>
                        <SelectItem value="tv">TV Shows</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select
                      value={sortBy}
                      onValueChange={(v: any) => setSortBy(v)}
                    >
                      <SelectTrigger className={`w-[140px] h-9 text-xs rounded-sm ${FIELD_CLASS}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="recent">Recent</SelectItem>
                        <SelectItem value="title">Title A-Z</SelectItem>
                        <SelectItem value="year">Year</SelectItem>
                        <SelectItem value="rating">Rating</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="relative sm:max-w-xs flex-1">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
                    <Input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search your list..."
                      className={`h-9 text-xs pl-8 rounded-sm ${FIELD_CLASS}`}
                    />
                  </div>
                </div>
              )}
            </div>

            {selectionMode &&
              selectedIds.size > 0 &&
              showFilters && (
                <div className="flex flex-wrap items-center justify-between gap-2 mb-6 bg-[#0b0b0b] border border-white/10 rounded-sm p-3">
                  <span className="text-sm text-gray-400">
                    {selectedIds.size} selected
                  </span>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="text-xs h-8 rounded-sm"
                      onClick={selectAllVisible}
                    >
                      Select All
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs h-8 rounded-sm text-gray-400 hover:text-white hover:bg-white/10"
                      onClick={clearSelection}
                    >
                      Clear
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-8 rounded-sm border-white/15 text-white hover:bg-white/10"
                      onClick={bulkAddToOther}
                    >
                      {activeTab === "watchlist"
                        ? "Add to Favorites"
                        : "Add to Watchlist"}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="text-xs h-8 rounded-sm"
                      onClick={bulkRemove}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              )}

            {/* Overview */}
            <TabsContent value="overview" className="space-y-10 mt-0">
              {inProgress.length > 0 && (
                <section>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-logo tracking-wide text-2xl sm:text-3xl">
                      Continue Watching
                    </h2>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs gap-1 text-gray-400 hover:text-white hover:bg-white/10"
                      onClick={() => setActiveTab("watching")}
                    >
                      View All <ChevronRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {inProgress.slice(0, 3).map((item) => {
                      const title = item.title || item.name || "Untitled";
                      const isTV = !!item.name;
                      const backdropUrl = item.backdrop_path
                        ? `https://image.tmdb.org/t/p/w780${item.backdrop_path}`
                        : item.poster_path
                          ? `https://image.tmdb.org/t/p/w500${item.poster_path}`
                          : null;
                      return (
                        <Link
                          key={item.id}
                          href={isTV ? `/tv/${item.id}` : `/movie/${item.id}`}
                          className="group block overflow-hidden rounded-sm border border-white/10 bg-[#0b0b0b] hover:border-white/25 transition-all"
                        >
                          <div className="relative aspect-video bg-white/5">
                            {backdropUrl ? (
                              <img
                                src={backdropUrl}
                                alt={title}
                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                loading="lazy"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Film className="w-8 h-8 text-gray-600" />
                              </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <div className="bg-white/15 backdrop-blur-sm rounded-full p-3 border border-white/30">
                                <Play className="w-5 h-5 text-white fill-white" />
                              </div>
                            </div>
                            <div className="absolute bottom-0 left-0 right-0 p-3">
                              <p className="text-white font-medium text-sm line-clamp-1 mb-1">
                                {title}
                              </p>
                              <div className="flex items-center gap-2 text-xs text-gray-300 mb-2">
                                <Clock className="w-3 h-3" />
                                <span>
                                  {formatTimeLeft(
                                    item.watchData.watchProgress,
                                    item.runtime,
                                  )}
                                </span>
                              </div>
                              <div className="w-full bg-white/20 rounded-full h-1">
                                <div
                                  className="bg-red-600 h-1 rounded-full"
                                  style={{
                                    width: `${item.watchData.watchProgress}%`,
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </section>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  type="button"
                  className="group flex items-center gap-4 rounded-sm border border-white/10 bg-[#0b0b0b] p-5 text-left hover:border-red-600/40 transition-all"
                  onClick={() => setActiveTab("watchlist")}
                >
                  <div className="w-12 h-12 rounded-sm bg-red-600/10 border border-red-600/20 flex items-center justify-center shrink-0">
                    <Bookmark className="w-5 h-5 text-red-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-logo text-2xl leading-none">
                      {watchlist.length}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">In your watchlist</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-white transition-colors" />
                </button>
                <button
                  type="button"
                  className="group flex items-center gap-4 rounded-sm border border-white/10 bg-[#0b0b0b] p-5 text-left hover:border-red-600/40 transition-all"
                  onClick={() => setActiveTab("favorites")}
                >
                  <div className="w-12 h-12 rounded-sm bg-red-600/10 border border-red-600/20 flex items-center justify-center shrink-0">
                    <Heart className="w-5 h-5 text-red-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-logo text-2xl leading-none">
                      {favorites.length}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">Favorites</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-white transition-colors" />
                </button>
              </div>

              {(watchlist.length > 0 || favorites.length > 0) && (
                <section>
                  <h2 className="font-logo tracking-wide text-2xl sm:text-3xl mb-4">
                    Recently Added
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {[...favorites.slice(0, 3), ...watchlist.slice(0, 3)]
                      .filter(
                        (item, index, self) =>
                          self.findIndex((i) => i.id === item.id) === index,
                      )
                      .slice(0, 6)
                      .map((item) => {
                        const title = getMediaTitle(item);
                        const isTv = isTVItem(item);
                        const progress = watchProgressMap[item.id];
                        return (
                          <Link
                            key={item.id}
                            href={isTv ? `/tv/${item.id}` : `/movie/${item.id}`}
                            className="group block"
                          >
                            <div className="relative overflow-hidden rounded-sm border border-white/10">
                              <img
                                src={getMediaPosterUrl(item)}
                                alt={title}
                                className="w-full aspect-[2/3] object-cover transition-transform duration-300 group-hover:scale-105"
                                loading="lazy"
                              />
                              {progress !== undefined && progress > 0 && (
                                <div className="absolute bottom-0 left-0 right-0">
                                  <div className="w-full bg-black/60 h-1">
                                    <div
                                      className="bg-red-600 h-1"
                                      style={{ width: `${progress}%` }}
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                            <p className="text-xs font-medium mt-1.5 line-clamp-1 group-hover:text-red-500 transition-colors">
                              {title}
                            </p>
                            <p className="text-[10px] text-gray-500">
                              {getMediaReleaseYear(item)}
                            </p>
                          </Link>
                        );
                      })}
                  </div>
                </section>
              )}

              {totalItems === 0 && inProgress.length === 0 && (
                <div className="text-center py-20">
                  <div className="w-20 h-20 bg-white/5 border border-white/10 rounded-full flex items-center justify-center mx-auto mb-5">
                    <Bookmark className="w-8 h-8 text-gray-500" />
                  </div>
                  <h3 className="font-logo tracking-wide text-3xl mb-2">
                    Your list is empty
                  </h3>
                  <p className="text-gray-400 text-sm mb-6 max-w-sm mx-auto">
                    Start exploring and add movies or TV shows to build your
                    personal library.
                  </p>
                  <div className="flex flex-wrap gap-3 justify-center">
                    <Button asChild className="bg-red-600 hover:bg-red-700 rounded-sm">
                      <Link href="/movies">Browse Movies</Link>
                    </Button>
                    <Button
                      asChild
                      variant="outline"
                      className="border-white/20 text-white hover:bg-white/10 rounded-sm"
                    >
                      <Link href="/tv">Browse TV Shows</Link>
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Watching */}
            <TabsContent value="watching" className="mt-0">
              {inProgress.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {inProgress.map((item) => {
                    const title = item.title || item.name || "Untitled";
                    const isTV = !!item.name;
                    const backdropUrl = item.backdrop_path
                      ? `https://image.tmdb.org/t/p/w780${item.backdrop_path}`
                      : item.poster_path
                        ? `https://image.tmdb.org/t/p/w500${item.poster_path}`
                        : null;
                    return (
                      <Link
                        key={item.id}
                        href={isTV ? `/tv/${item.id}` : `/movie/${item.id}`}
                        className="group block overflow-hidden rounded-sm border border-white/10 bg-[#0b0b0b] hover:border-white/25 transition-all"
                      >
                        <div className="relative aspect-video bg-white/5">
                          {backdropUrl ? (
                            <img
                              src={backdropUrl}
                              alt={title}
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Film className="w-8 h-8 text-gray-600" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="bg-white/15 backdrop-blur-sm rounded-full p-3 border border-white/30">
                              <Play className="w-6 h-6 text-white fill-white" />
                            </div>
                          </div>
                          {isTV && (
                            <Badge className="absolute top-2 left-2 bg-black/60 text-white text-[10px] border-0">
                              TV
                            </Badge>
                          )}
                          <div className="absolute bottom-0 left-0 right-0 p-3">
                            <p className="text-white font-medium text-sm line-clamp-1 mb-1">
                              {title}
                            </p>
                            <div className="flex items-center justify-between text-xs text-gray-300 mb-2">
                              <div className="flex items-center gap-1.5">
                                <Clock className="w-3 h-3" />
                                <span>
                                  {formatTimeLeft(
                                    item.watchData.watchProgress,
                                    item.runtime,
                                  )}
                                </span>
                              </div>
                              <span>{item.watchData.watchProgress}%</span>
                            </div>
                            <div className="w-full bg-white/20 rounded-full h-1">
                              <div
                                className="bg-red-600 h-1 rounded-full"
                                style={{
                                  width: `${item.watchData.watchProgress}%`,
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-20">
                  <div className="w-20 h-20 bg-white/5 border border-white/10 rounded-full flex items-center justify-center mx-auto mb-5">
                    <Play className="w-8 h-8 text-gray-500" />
                  </div>
                  <h3 className="font-logo tracking-wide text-3xl mb-2">
                    Nothing in progress
                  </h3>
                  <p className="text-gray-400 text-sm mb-6 max-w-sm mx-auto">
                    When you start watching something, it will appear here so you
                    can pick up where you left off.
                  </p>
                  <Button
                    asChild
                    variant="outline"
                    className="border-white/20 text-white hover:bg-white/10 rounded-sm"
                  >
                    <Link href="/home">Start Browsing</Link>
                  </Button>
                </div>
              )}
            </TabsContent>

            {/* Watchlist */}
            <TabsContent value="watchlist" className="mt-0">
              <MediaGrid
                items={displayWatchlist}
                isLoading={isPreferencesLoading}
                onRemove={handleRemoveFromWatchlist}
                emptyMessage="Your watchlist is empty."
                emptyAction={
                  <Button asChild className="bg-red-600 hover:bg-red-700 rounded-sm">
                    <Link href="/home">Discover Movies</Link>
                  </Button>
                }
                getMediaTitle={getMediaTitle}
                getMediaPosterUrl={getMediaPosterUrl}
                getMediaReleaseYear={getMediaReleaseYear}
                viewMode={viewMode}
                selectable={selectionMode}
                selectedIds={selectedIds}
                onToggleSelect={toggleSelect}
                watchProgressMap={watchProgressMap}
              />
            </TabsContent>

            {/* Favorites */}
            <TabsContent value="favorites" className="mt-0">
              <MediaGrid
                items={displayFavorites}
                isLoading={isPreferencesLoading}
                onRemove={handleRemoveFromFavorites}
                emptyMessage="No favorites yet."
                emptyAction={
                  <Button asChild className="bg-red-600 hover:bg-red-700 rounded-sm">
                    <Link href="/home">Discover Movies</Link>
                  </Button>
                }
                getMediaTitle={getMediaTitle}
                getMediaPosterUrl={getMediaPosterUrl}
                getMediaReleaseYear={getMediaReleaseYear}
                viewMode={viewMode}
                selectable={selectionMode}
                selectedIds={selectedIds}
                onToggleSelect={toggleSelect}
                watchProgressMap={watchProgressMap}
              />
            </TabsContent>

            {/* Collections */}
            <TabsContent value="collections" className="space-y-6 mt-0">
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  {collections.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setActiveCollectionId(c.id)}
                      className={`px-3 py-1.5 rounded-full border text-sm transition-colors ${
                        activeCollectionId === c.id
                          ? "bg-red-600 border-red-600 text-white font-medium"
                          : "bg-white/[0.03] border-white/10 text-gray-400 hover:text-white hover:bg-white/10"
                      }`}
                    >
                      {c.name}
                    </button>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full text-xs border-white/15 text-white hover:bg-white/10"
                    onClick={async () => {
                      const name = prompt("New collection name?");
                      if (!name) return;
                      const color =
                        prompt("Optional color hex (e.g. #e11d48)") || undefined;
                      const created = await createCollection(name, color);
                      setActiveCollectionId(created.id);
                    }}
                  >
                    + New
                  </Button>
                </div>

                {activeCollectionId && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-8 rounded-sm border-white/15 text-white hover:bg-white/10"
                      onClick={async () => {
                        const col = collections.find(
                          (c) => c.id === activeCollectionId,
                        );
                        if (!col) return;
                        const newName = prompt("Rename collection", col.name);
                        if (!newName) return;
                        await renameCollection(col.id, newName);
                      }}
                    >
                      Rename
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="text-xs h-8 rounded-sm"
                      onClick={async () => {
                        if (!confirm("Delete this collection?")) return;
                        await deleteCollection(activeCollectionId);
                        setActiveCollectionId(null);
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                )}
              </div>

              {activeCollectionId ? (
                <MasonryMediaGrid
                  items={
                    collections.find((c) => c.id === activeCollectionId)?.items ||
                    []
                  }
                  onRemove={(itemId) =>
                    removeItemFromCollection(activeCollectionId, itemId)
                  }
                  getMediaTitle={getMediaTitle}
                  getMediaPosterUrl={getMediaPosterUrl}
                  getMediaReleaseYear={getMediaReleaseYear}
                />
              ) : (
                <div className="text-center py-16">
                  <div className="w-16 h-16 bg-white/5 border border-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Star className="w-7 h-7 text-gray-500" />
                  </div>
                  <p className="text-gray-400 text-sm">
                    Create a collection to group titles your way.
                  </p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default MyList;
