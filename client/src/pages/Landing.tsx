import React, { useState, useEffect, useRef, useMemo } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  Play,
  ArrowRight,
  ArrowUp,
  ChevronDown,
  Check,
  Clock,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getTrendingMovies, getTrendingTVShows } from "@/lib/tmdb";

/**
 * Lightweight scroll-reveal hook.
 * Returns a ref and a `visible` boolean that turns true once the
 * element scrolls into view. One-shot — never resets.
 */
function useReveal<T extends HTMLElement = HTMLElement>(threshold = 0.1) {
  const ref = useRef<T>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || visible) return;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { threshold, rootMargin: "0px 0px 80px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  });

  return { ref, visible };
}

interface MediaItem {
  id: number;
  title?: string;
  name?: string;
  backdrop_path: string | null;
  poster_path: string | null;
  vote_average: number;
  overview: string;
  release_date?: string;
  first_air_date?: string;
  genre_ids?: number[];
}

const GENRE_MAP: Record<number, string> = {
  28: "Action",
  12: "Adventure",
  16: "Animation",
  35: "Comedy",
  80: "Crime",
  99: "Documentary",
  18: "Drama",
  10751: "Family",
  14: "Fantasy",
  36: "History",
  27: "Horror",
  10402: "Music",
  9648: "Mystery",
  10749: "Romance",
  878: "Sci-Fi",
  10770: "TV Movie",
  53: "Thriller",
  10752: "War",
  37: "Western",
  10759: "Action & Adventure",
  10762: "Kids",
  10763: "News",
  10764: "Reality",
  10765: "Sci-Fi & Fantasy",
  10766: "Soap",
  10767: "Talk",
  10768: "War & Politics",
};

const FAQS: { q: string; a: string }[] = [
  {
    q: "Is YMovies free to use?",
    a: "Yes. Browsing, recommendations, episode tracking, and your watchlist are completely free. An account simply syncs everything across your devices.",
  },
  {
    q: "Does YMovies host or stream the movies?",
    a: "No. YMovies is a discovery and tracking companion — we show you where each title is legally available and link you straight to the platform that carries it.",
  },
  {
    q: "How do the recommendations actually work?",
    a: "Our engine blends collaborative filtering (people whose taste overlaps with yours) with content analysis (genre, cast, themes, mood) to surface titles that fit you — not just whatever is trending.",
  },
  {
    q: "Where does the catalogue come from?",
    a: "Titles, artwork, and metadata are powered by TMDB, spanning 800K+ movies and shows across every genre, language, and region.",
  },
  {
    q: "Do I need an account to start?",
    a: "Not at all — explore freely. Creating an account unlocks your watchlist, continue-watching, episode progress, and recommendations that sharpen the more you watch.",
  },
];

/**
 * Netflix-style alternating feature row. Text on one side, a live mockup
 * (built from real catalogue imagery) on the other. Each panel reveals
 * itself as it scrolls into view — text and visual easing in from opposite
 * sides so the eye is led across the row.
 */
function FeaturePanel({
  reverse = false,
  eyebrow,
  title,
  desc,
  points,
  visual,
}: {
  reverse?: boolean;
  eyebrow: string;
  title: React.ReactNode;
  desc: string;
  points?: string[];
  visual: React.ReactNode;
}) {
  const { ref, visible } = useReveal<HTMLDivElement>(0.15);

  return (
    <div
      ref={ref}
      className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-20 items-center"
    >
      {/* Text */}
      <div
        className={`${reverse ? "lg:order-2" : ""} transition-all duration-700 ease-out ${
          visible
            ? "opacity-100 translate-x-0"
            : `opacity-0 ${reverse ? "lg:translate-x-10" : "lg:-translate-x-10"} translate-y-6`
        }`}
      >
        <p className="text-red-500 text-xs font-semibold uppercase tracking-[0.25em] mb-4">
          {eyebrow}
        </p>
        <h3 className="font-logo tracking-wide text-3xl sm:text-4xl lg:text-5xl leading-[0.95] mb-5">
          {title}
        </h3>
        <p className="text-gray-400 leading-relaxed mb-6 max-w-lg">{desc}</p>
        {points && (
          <ul className="space-y-3">
            {points.map((p) => (
              <li
                key={p}
                className="flex items-start gap-3 text-sm text-gray-300"
              >
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-600/15">
                  <Check className="w-3 h-3 text-red-500" />
                </span>
                <span>{p}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Visual */}
      <div
        className={`${reverse ? "lg:order-1" : ""} transition-all duration-700 delay-150 ease-out ${
          visible
            ? "opacity-100 translate-y-0 scale-100"
            : "opacity-0 translate-y-10 scale-[0.97]"
        }`}
      >
        {visual}
      </div>
    </div>
  );
}

const Landing = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const heroRef = useRef<HTMLDivElement>(null);

  const { data: trendingMovies } = useQuery<MediaItem[]>({
    queryKey: ["landing-trending-movies"],
    queryFn: () => getTrendingMovies("week"),
    staleTime: 1000 * 60 * 30,
  });

  const { data: trendingTV } = useQuery<MediaItem[]>({
    queryKey: ["landing-trending-tv"],
    queryFn: () => getTrendingTVShows("week"),
    staleTime: 1000 * 60 * 30,
  });

  const showcase = useMemo(() => {
    if (!trendingMovies?.length) return [];
    return trendingMovies
      .filter((m) => m.backdrop_path && m.overview)
      .slice(0, 5);
  }, [trendingMovies]);

  const posterWall = useMemo(() => {
    const movies = (trendingMovies || []).filter((m) => m.poster_path);
    const tv = (trendingTV || []).filter((m) => m.poster_path);
    const combined = [...movies, ...tv];
    const unique = combined.filter(
      (item, i, arr) => arr.findIndex((a) => a.id === item.id) === i,
    );
    return unique.slice(0, 18);
  }, [trendingMovies, trendingTV]);

  const current = showcase[activeIndex];

  // Source items for the feature-panel mockups (all real catalogue data)
  const recHero = showcase[1] || showcase[0];
  const recPosters = posterWall.slice(2, 7);
  const wtwItem =
    (trendingMovies || []).find((m) => m.poster_path) || posterWall[0];
  const resumeItem = showcase[2] || showcase[0];
  const showItem =
    (trendingTV || []).find((t) => t.poster_path) ||
    (trendingMovies || [])[0];

  // Background for the oversized footer wordmark — a film still clipped into
  // the lettering, dimmed so it reads as a watermark. Falls back to a soft
  // white gradient before the catalogue loads.
  const footerBackdrop = showcase[0]?.backdrop_path;
  const wordmarkBg = footerBackdrop
    ? `linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.62)), url(https://image.tmdb.org/t/p/original${footerBackdrop})`
    : "linear-gradient(180deg, rgba(255,255,255,0.14), rgba(255,255,255,0.03))";

  useEffect(() => {
    setTimeout(() => setIsVisible(true), 100);
    const handleScroll = () => setShowBackToTop(window.scrollY > 400);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const startAutoplay = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (showcase.length < 2) return;
    intervalRef.current = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % showcase.length);
    }, 6000);
  };

  useEffect(() => {
    startAutoplay();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showcase.length]);

  // Jump to a slide and keep the rotation running from that point
  const goToSlide = (i: number) => {
    setActiveIndex(i);
    startAutoplay();
  };

  const toggleSection = (id: string) => {
    setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const scrollToContent = () => {
    const target = document.getElementById("discover");
    target?.scrollIntoView({ behavior: "smooth" });
  };

  const getTitle = (item: MediaItem) => item.title || item.name || "";
  const getYear = (item: MediaItem) => {
    const d = item.release_date || item.first_air_date;
    return d ? new Date(d).getFullYear() : "";
  };

  // Scroll-reveal for each major section
  const discover = useReveal<HTMLElement>(0.08);
  const features = useReveal<HTMLElement>(0.08);
  const trending = useReveal<HTMLElement>(0.08);
  const faq = useReveal<HTMLElement>(0.08);
  const cta = useReveal<HTMLElement>(0.08);
  const footer = useReveal<HTMLElement>(0.05);

  /** Shared reveal classes — opacity 0 by default, animate in once visible */
  const reveal = (visible: boolean, delay = 0) =>
    `transition-all duration-700 ease-out ${
      visible
        ? "opacity-100 translate-y-0"
        : "opacity-0 translate-y-8"
    }` + (delay ? ` delay-[${delay}ms]` : "");

  return (
    <div className="bg-black text-white overflow-x-hidden">
      {/* ===== HERO — FULL BLEED CINEMATIC ===== */}
      <section ref={heroRef} className="relative h-screen w-full overflow-hidden">
        {/* Loading backdrop — a warm, slow-breathing gradient so the first
            paint reads as cinema rather than a blank black frame */}
        {showcase.length === 0 && (
          <div className="absolute inset-0 bg-gradient-to-br from-[#1a0606] via-black to-black animate-pulse" />
        )}

        {/* Backdrop layers */}
        {showcase.map((item, i) => (
          <div
            key={item.id}
            className="absolute inset-0 transition-opacity duration-[1200ms] ease-in-out"
            style={{ opacity: i === activeIndex ? 1 : 0 }}
          >
            <img
              src={`https://image.tmdb.org/t/p/original${item.backdrop_path}`}
              alt=""
              className="w-full h-full object-cover animate-ken-burns will-change-transform"
              loading={i === 0 ? "eager" : "lazy"}
            />
          </div>
        ))}

        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/30" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-transparent to-transparent" />
        {/* Vignette — darkened edges, like a projected frame */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(120% 120% at 50% 45%, transparent 55%, rgba(0,0,0,0.55) 100%)",
          }}
        />

        {/* Content */}
        <div className="absolute inset-0 flex flex-col justify-end pb-20 sm:pb-28 px-6 sm:px-12 lg:px-20">
          <div
            className={`max-w-3xl transition-all duration-1000 delay-300 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"}`}
          >
            {/* Brand */}
            <div className="mb-8">
              <h1 className="font-logo text-4xl sm:text-7xl lg:text-8xl text-white tracking-wider leading-none">
                YMOVIES
              </h1>
              <div className="h-1 w-16 bg-red-600 mt-3" />
            </div>

            {/* Active movie info */}
            {current && (
              <div key={activeIndex} className="space-y-4 mb-8 animate-hero-reveal">
                <div className="flex items-center gap-3 text-sm text-gray-400">
                  <span className="text-red-500 font-semibold uppercase tracking-widest text-xs">
                    Trending Now
                  </span>
                  <span className="w-px h-4 bg-gray-700" />
                  <span>{getYear(current)}</span>
                  {current.vote_average > 0 && (
                    <>
                      <span className="w-px h-4 bg-gray-700" />
                      <span className="text-yellow-500">
                        {current.vote_average.toFixed(1)}
                      </span>
                    </>
                  )}
                </div>
                <h2 className="font-logo tracking-wide text-2xl sm:text-5xl lg:text-6xl leading-none">
                  {getTitle(current)}
                </h2>
                <p className="text-gray-300 text-sm sm:text-base leading-relaxed max-w-xl line-clamp-3">
                  {current.overview}
                </p>
              </div>
            )}

            {/* CTA */}
            <div className="flex flex-wrap gap-3">
              <Link href="/home">
                <Button
                  size="lg"
                  className="bg-red-600 hover:bg-red-700 text-white gap-2 px-6 sm:px-8 py-2 sm:py-3 rounded-sm text-sm sm:text-base"
                >
                  <Play className="w-4 h-4 fill-white" /> Start Exploring
                </Button>
              </Link>
              <Link href="/signup">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white/30 text-white hover:bg-white/10 gap-2 px-6 sm:px-8 py-2 sm:py-3 rounded-sm text-sm sm:text-base"
                >
                  Create Account <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Timeline dots */}
          {showcase.length > 1 && (
            <div className="absolute bottom-8 right-6 sm:right-12 lg:right-20 flex flex-col gap-2">
              {showcase.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goToSlide(i)}
                  aria-label={`Go to slide ${i + 1}`}
                  className={`relative w-2 rounded-full overflow-hidden transition-all duration-500 ${
                    i === activeIndex
                      ? "h-8 bg-white/20"
                      : "h-2 bg-white/30 hover:bg-white/60"
                  }`}
                >
                  {i === activeIndex && (
                    <span
                      key={activeIndex}
                      className="absolute inset-x-0 top-0 rounded-full bg-red-600 animate-dot-progress"
                    />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Scroll cue */}
        <button
          onClick={scrollToContent}
          className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/40 hover:text-white/80 transition-colors animate-bounce"
        >
          <ChevronDown className="w-6 h-6" />
        </button>
      </section>

      {/* ===== DISCOVER SECTION — POSTER MOSAIC ===== */}
      <section
        id="discover"
        ref={discover.ref}
        className="relative py-24 px-6 sm:px-12 lg:px-20"
      >
        <div className={`max-w-7xl mx-auto ${reveal(discover.visible)}`}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Left — text */}
            <div>
              <p className="text-red-500 text-xs font-semibold uppercase tracking-[0.25em] mb-4">
                What is YMovies
              </p>
              <h2 className="font-logo tracking-wide text-3xl sm:text-5xl lg:text-6xl leading-[0.95] mb-6">
                Your taste.{" "}
                <br />
                <span className="text-red-600">Your algorithm.</span>
                <br />
                Your next obsession.
              </h2>
              <p className="text-gray-400 leading-relaxed mb-8 max-w-lg">
                YMovies is a personal entertainment companion that learns how
                you watch. Our hybrid recommendation engine combines
                collaborative filtering with content analysis to surface the
                films and shows that actually match your taste, not just
                what is popular.
              </p>

              <div className="space-y-5 mb-10">
                {[
                  {
                    num: "01",
                    label: "Discover",
                    desc: "Browse 800K+ titles with smart filters, genres, and mood-based browsing.",
                  },
                  {
                    num: "02",
                    label: "Track",
                    desc: "Continue watching across devices. Episode tracking, progress bars, watch history.",
                  },
                  {
                    num: "03",
                    label: "Connect",
                    desc: "See where to stream. We show you every platform a title is available on.",
                  },
                ].map((step) => (
                  <div key={step.num} className="flex gap-4 items-start">
                    <span className="text-red-600 font-logo text-2xl leading-none mt-0.5">
                      {step.num}
                    </span>
                    <div>
                      <p className="font-semibold text-white mb-0.5">
                        {step.label}
                      </p>
                      <p className="text-gray-500 text-sm leading-relaxed">
                        {step.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <Link href="/home">
                <Button
                  size="lg"
                  className="bg-red-600 hover:bg-red-700 rounded-sm gap-2 px-8 text-base"
                >
                  Explore the Catalog <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>

            {/* Right — poster mosaic */}
            <div className="relative hidden lg:block">
              <div className="grid grid-cols-3 gap-3">
                {posterWall.slice(0, 9).map((item, i) => {
                  const isLarge = i === 1 || i === 4;
                  return (
                    <Link
                      key={item.id}
                      href={
                        item.title
                          ? `/movie/${item.id}`
                          : `/tv/${item.id}`
                      }
                    >
                      <div
                        className={`relative overflow-hidden rounded-lg group ${isLarge ? "row-span-2" : ""}`}
                        style={{ aspectRatio: isLarge ? "2/3" : "2/2.4" }}
                      >
                        <img
                          src={`https://image.tmdb.org/t/p/w500${item.poster_path}`}
                          alt={getTitle(item)}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors duration-300" />
                        <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                          <p className="text-white text-xs font-medium truncate">
                            {getTitle(item)}
                          </p>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
              {/* Decorative glow */}
              <div className="absolute -inset-8 bg-red-600/5 rounded-3xl -z-10 blur-3xl" />
            </div>

            {/* Mobile poster strip */}
            <div className="lg:hidden -mx-6 px-6 overflow-x-auto scrollbar-hide">
              <div className="flex gap-3 pb-2" style={{ width: "max-content" }}>
                {posterWall.slice(0, 8).map((item) => (
                  <Link
                    key={item.id}
                    href={
                      item.title ? `/movie/${item.id}` : `/tv/${item.id}`
                    }
                  >
                    <img
                      src={`https://image.tmdb.org/t/p/w342${item.poster_path}`}
                      alt={getTitle(item)}
                      className="w-28 rounded-lg flex-shrink-0"
                      loading="lazy"
                    />
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== FEATURES — NETFLIX-STYLE ALTERNATING PANELS ===== */}
      <section
        ref={features.ref}
        className="relative py-24 px-6 sm:px-12 lg:px-20 bg-[#0a0a0a] border-y border-white/5"
      >
        <div className="max-w-7xl mx-auto">
          <div className={`text-center mb-20 ${reveal(features.visible)}`}>
            <p className="text-red-500 text-xs font-semibold uppercase tracking-[0.25em] mb-4">
              Built Different
            </p>
            <h2 className="font-logo tracking-wide text-3xl sm:text-5xl lg:text-6xl leading-tight mb-4">
              Everything you need to watch smarter
            </h2>
            <p className="text-gray-400 max-w-xl mx-auto">
              Not another database. A companion that remembers what you love and
              tells you exactly where to watch it.
            </p>
          </div>

          <div className="space-y-24 lg:space-y-32">
            {/* 1 — Recommendations */}
            <FeaturePanel
              eyebrow="Recommendations"
              title={
                <>
                  A home screen that{" "}
                  <span className="text-red-600">learns your taste</span>
                </>
              }
              desc="Our hybrid engine studies what you watch, rate, and save — then rebuilds your home page around it. The more you watch, the sharper it gets."
              points={[
                "13+ personalised rows that evolve with you",
                "Blends collaborative filtering with content analysis",
                "No generic top-10 lists everyone else sees",
              ]}
              visual={
                <div className="relative">
                  <div className="rounded-2xl overflow-hidden border border-white/10 bg-[#0b0b0b] shadow-2xl shadow-black/70">
                    <div className="flex items-center gap-1.5 px-4 py-3 border-b border-white/5">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
                      <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/50" />
                      <span className="w-2.5 h-2.5 rounded-full bg-green-500/40" />
                      <span className="ml-3 font-logo text-lg tracking-wider text-white/70">
                        YMOVIES
                      </span>
                    </div>
                    {recHero && (
                      <div className="relative aspect-[16/8]">
                        <img
                          src={`https://image.tmdb.org/t/p/w780${recHero.backdrop_path}`}
                          alt=""
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0b0b0b] via-[#0b0b0b]/10 to-transparent" />
                        <div className="absolute bottom-3 left-4 right-4">
                          <p className="text-[10px] text-red-500 font-semibold uppercase tracking-[0.2em] mb-1">
                            Because you watch sci-fi
                          </p>
                          <p className="text-base font-bold leading-tight truncate">
                            {getTitle(recHero)}
                          </p>
                        </div>
                      </div>
                    )}
                    <div className="p-3">
                      <p className="text-[11px] text-gray-400 mb-2 px-1">
                        Picked for you
                      </p>
                      <div className="flex gap-2">
                        {recPosters.map((p) => (
                          <img
                            key={p.id}
                            src={`https://image.tmdb.org/t/p/w185${p.poster_path}`}
                            alt={getTitle(p)}
                            className="w-1/5 rounded-md aspect-[2/3] object-cover"
                            loading="lazy"
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="absolute -inset-6 bg-red-600/10 blur-3xl -z-10 rounded-full" />
                </div>
              }
            />

            {/* 2 — Where to watch */}
            <FeaturePanel
              reverse
              eyebrow="Where to watch"
              title={
                <>
                  Stop app-hopping.{" "}
                  <span className="text-red-600">We know who has it.</span>
                </>
              }
              desc="Every title shows you exactly which streaming services carry it right now, so you go straight from 'I want to watch this' to pressing play."
              points={[
                "Live streaming availability per title",
                "One tap to the platform that has it",
                "No more guessing across six different apps",
              ]}
              visual={
                wtwItem && (
                  <div className="relative rounded-2xl border border-white/10 bg-[#0b0b0b] p-5 shadow-2xl shadow-black/70">
                    <div className="flex gap-5">
                      <img
                        src={`https://image.tmdb.org/t/p/w342${wtwItem.poster_path}`}
                        alt={getTitle(wtwItem)}
                        className="w-28 rounded-lg shrink-0 aspect-[2/3] object-cover"
                        loading="lazy"
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-lg leading-tight truncate">
                          {getTitle(wtwItem)}
                        </h4>
                        <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
                          <span>{getYear(wtwItem)}</span>
                          {wtwItem.vote_average > 0 && (
                            <>
                              <span className="w-px h-3 bg-gray-700" />
                              <span className="flex items-center gap-1 text-yellow-500">
                                <Star className="w-3 h-3 fill-yellow-500" />
                                {wtwItem.vote_average.toFixed(1)}
                              </span>
                            </>
                          )}
                        </div>
                        <p className="text-[11px] text-gray-500 uppercase tracking-[0.2em] mt-4 mb-2">
                          Available on
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {[
                            { name: "Netflix", color: "bg-red-600" },
                            { name: "Prime Video", color: "bg-sky-500" },
                            { name: "Disney+", color: "bg-indigo-500" },
                            { name: "Max", color: "bg-purple-500" },
                          ].map((s) => (
                            <span
                              key={s.name}
                              className="inline-flex items-center gap-1.5 rounded-md bg-white/5 border border-white/10 px-2.5 py-1 text-xs text-gray-200"
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${s.color}`}
                              />
                              {s.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="mt-5 inline-flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white">
                      <Play className="w-3.5 h-3.5 fill-white" /> Watch now
                    </div>
                  </div>
                )
              }
            />

            {/* 3 — Continue watching */}
            <FeaturePanel
              eyebrow="Continue watching"
              title={
                <>
                  Pick up{" "}
                  <span className="text-red-600">exactly</span> where you left
                  off
                </>
              }
              desc="Close the tab mid-episode and come back days later — YMovies remembers the title, the episode, and the minute, on every device you use."
              points={[
                "Resume to the exact second, anywhere",
                "Progress bars and time remaining at a glance",
                "Synced across phone, laptop, and TV",
              ]}
              visual={
                resumeItem && (
                  <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl shadow-black/70 group">
                    <div className="relative aspect-[16/9]">
                      <img
                        src={`https://image.tmdb.org/t/p/w780${resumeItem.backdrop_path}`}
                        alt={getTitle(resumeItem)}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/15 backdrop-blur-sm border border-white/30 transition-transform duration-300 group-hover:scale-110">
                          <Play className="w-6 h-6 fill-white text-white ml-0.5" />
                        </span>
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="min-w-0">
                            <p className="font-bold leading-tight truncate">
                              {getTitle(resumeItem)}
                            </p>
                            <p className="text-xs text-gray-300">
                              S2 E4 · Resume
                            </p>
                          </div>
                          <span className="flex items-center gap-1 text-xs text-gray-300 shrink-0">
                            <Clock className="w-3 h-3" /> 18 min left
                          </span>
                        </div>
                        <div className="h-1 w-full rounded-full bg-white/20 overflow-hidden">
                          <div className="h-full w-[64%] rounded-full bg-red-600" />
                        </div>
                      </div>
                    </div>
                  </div>
                )
              }
            />

            {/* 4 — Episode tracking */}
            <FeaturePanel
              reverse
              eyebrow="Episode tracking"
              title={
                <>
                  Never lose your place in a{" "}
                  <span className="text-red-600">long series</span>
                </>
              }
              desc="Tick off episodes as you go and YMovies keeps the whole season in order — so you always know what you've seen and what's up next."
              points={[
                "Mark episodes watched across every season",
                "Always know which episode is next",
                "Season-by-season progress at a glance",
              ]}
              visual={
                showItem && (
                  <div className="rounded-2xl border border-white/10 bg-[#0b0b0b] p-5 shadow-2xl shadow-black/70">
                    <div className="flex items-center justify-between mb-4">
                      <div className="min-w-0">
                        <h4 className="font-bold leading-tight truncate">
                          {getTitle(showItem)}
                        </h4>
                        <p className="text-xs text-gray-500">Season 1</p>
                      </div>
                      <span className="text-xs text-gray-400 shrink-0">
                        3 / 5 watched
                      </span>
                    </div>
                    <ul className="space-y-2">
                      {[
                        { n: 1, t: "Pilot", done: true },
                        { n: 2, t: "The Reckoning", done: true },
                        { n: 3, t: "Crossroads", done: true },
                        { n: 4, t: "Fallout", done: false, next: true },
                        { n: 5, t: "Aftermath", done: false },
                      ].map((ep) => (
                        <li
                          key={ep.n}
                          className={`flex items-center gap-3 rounded-lg px-3 py-2.5 ${
                            ep.next
                              ? "bg-red-600/10 border border-red-600/30"
                              : "bg-white/[0.03]"
                          }`}
                        >
                          <span
                            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
                              ep.done
                                ? "bg-red-600 text-white"
                                : ep.next
                                  ? "bg-red-600/20 text-red-400"
                                  : "bg-white/10 text-gray-400"
                            }`}
                          >
                            {ep.done ? (
                              <Check className="w-3.5 h-3.5" />
                            ) : ep.next ? (
                              <Play className="w-3 h-3 fill-current" />
                            ) : (
                              ep.n
                            )}
                          </span>
                          <span className="text-sm text-gray-300 truncate">
                            {ep.t}
                          </span>
                          {ep.next && (
                            <span className="ml-auto text-[10px] font-semibold uppercase tracking-wider text-red-400 shrink-0">
                              Up next
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )
              }
            />
          </div>
        </div>
      </section>

      {/* ===== TRENDING RIBBON ===== */}
      {trendingMovies && trendingMovies.length > 0 && (
        <section
          ref={trending.ref}
          className="py-24 px-6 sm:px-12 lg:px-20"
        >
          <div className={`max-w-7xl mx-auto ${reveal(trending.visible)}`}>
            <div className="flex items-end justify-between mb-8">
              <div>
                <p className="text-red-500 text-xs font-semibold uppercase tracking-[0.25em] mb-2">
                  Right Now
                </p>
                <h2 className="font-logo tracking-wide text-3xl sm:text-5xl">
                  Trending This Week
                </h2>
              </div>
              <Link href="/home">
                <span className="text-sm text-gray-400 hover:text-white transition-colors hidden sm:inline-flex items-center gap-1">
                  See all <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {trendingMovies
                .filter((m) => m.poster_path)
                .slice(0, 6)
                .map((movie, i) => (
                  <Link key={movie.id} href={`/movie/${movie.id}`}>
                    <div
                      className={`group relative transition-all duration-600 ease-out ${
                        trending.visible
                          ? "opacity-100 translate-y-0"
                          : "opacity-0 translate-y-6"
                      }`}
                      style={{ transitionDelay: trending.visible ? `${i * 100}ms` : "0ms" }}
                    >
                      <div className="relative overflow-hidden rounded-lg">
                        <img
                          src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
                          alt={getTitle(movie)}
                          className="w-full aspect-[2/3] object-cover transition-transform duration-500 group-hover:scale-105"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        <div className="absolute top-2 left-2">
                          <span className="font-logo text-3xl text-white/20 group-hover:text-white/60 transition-colors">
                            {String(i + 1).padStart(2, "0")}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm font-medium mt-2 truncate group-hover:text-red-500 transition-colors">
                        {getTitle(movie)}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>{getYear(movie)}</span>
                        {movie.genre_ids?.[0] && GENRE_MAP[movie.genre_ids[0]] && (
                          <>
                            <span className="w-1 h-1 bg-gray-600 rounded-full" />
                            <span>{GENRE_MAP[movie.genre_ids[0]]}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
            </div>
          </div>
        </section>
      )}

      {/* ===== FAQ ===== */}
      <section
        ref={faq.ref}
        className="py-24 px-6 sm:px-12 lg:px-20 bg-[#0a0a0a] border-t border-white/5"
      >
        <div className={`max-w-3xl mx-auto ${reveal(faq.visible)}`}>
          <div className="text-center mb-12">
            <p className="text-red-500 text-xs font-semibold uppercase tracking-[0.25em] mb-4">
              Good to know
            </p>
            <h2 className="font-logo tracking-wide text-3xl sm:text-5xl">
              Frequently asked questions
            </h2>
          </div>

          <div className="space-y-3">
            {FAQS.map((item, i) => {
              const open = openSections[`faq-${i}`];
              return (
                <div
                  key={i}
                  className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => toggleSection(`faq-${i}`)}
                    className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left hover:bg-white/[0.03] transition-colors"
                    aria-expanded={open ? true : false}
                  >
                    <span className="font-medium text-sm sm:text-base">
                      {item.q}
                    </span>
                    <ChevronDown
                      className={`w-5 h-5 text-red-500 shrink-0 transition-transform duration-300 ${
                        open ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  <div
                    className={`grid transition-all duration-300 ease-out ${
                      open
                        ? "grid-rows-[1fr] opacity-100"
                        : "grid-rows-[0fr] opacity-0"
                    }`}
                  >
                    <div className="overflow-hidden">
                      <p className="px-5 pb-5 text-sm text-gray-400 leading-relaxed">
                        {item.a}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===== FINAL CTA — CINEMATIC ===== */}
      <section
        ref={cta.ref}
        className="relative py-32 px-6 sm:px-12 lg:px-20 overflow-hidden"
      >
        {/* Ambient backdrop */}
        {showcase[2] && (
          <>
            <img
              src={`https://image.tmdb.org/t/p/original${showcase[2].backdrop_path}`}
              alt=""
              className="absolute inset-0 w-full h-full object-cover opacity-15"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/90 to-black/70" />
          </>
        )}

        <div className={`relative max-w-3xl mx-auto text-center ${reveal(cta.visible)}`}>
          <h2 className="font-logo tracking-wide text-4xl sm:text-6xl lg:text-7xl mb-6 leading-[0.95]">
            Stop scrolling.
            <br />
            <span className="text-red-600">Start watching.</span>
          </h2>
          <p className="text-gray-400 text-base sm:text-lg mb-10 max-w-xl mx-auto">
            Join YMovies and let your next favorite movie find you.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/home">
              <Button
                size="lg"
                className="bg-red-600 hover:bg-red-700 text-white px-8 sm:px-10 py-3 sm:py-5 text-sm sm:text-base rounded-sm gap-2"
              >
                <Play className="w-4 h-4 fill-white" /> Start Now
              </Button>
            </Link>
            <Link href="/signin">
              <Button
                size="lg"
                variant="outline"
                className="border-white/20 text-white hover:bg-white/10 px-8 sm:px-10 py-3 sm:py-5 text-sm sm:text-base rounded-sm"
              >
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer
        ref={footer.ref}
        className="relative overflow-hidden pt-16 px-6 sm:px-12 lg:px-20 border-t border-white/5"
      >
        {/* Oversized brand wordmark baked into the footer background — a film
            still clipped into the letters, anchored to the bottom and faded so
            it sits behind the content as a quiet watermark, never competing
            with the links. */}
        <div
          className="absolute inset-x-0 bottom-0 flex justify-center overflow-hidden opacity-50 pointer-events-none select-none"
          aria-hidden="true"
        >
          <h2
            className="font-logo leading-[1.15] tracking-wide text-transparent bg-clip-text bg-cover bg-center whitespace-nowrap pb-4"
            style={{
              fontSize: "clamp(4rem, 22vw, 17rem)",
              backgroundImage: wordmarkBg,
              WebkitMaskImage:
                "linear-gradient(to bottom, transparent 0%, black 40%, black 58%, transparent 92%)",
              maskImage:
                "linear-gradient(to bottom, transparent 0%, black 40%, black 58%, transparent 92%)",
            }}
          >
            YMOVIES
          </h2>
        </div>

        <div
          className={`relative z-10 max-w-7xl mx-auto ${reveal(footer.visible)}`}
        >
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-10 mb-14">
            {/* Brand */}
            <div className="col-span-2">
              <h3 className="font-logo text-2xl text-red-600 tracking-wider mb-3">
                YMOVIES
              </h3>
              <p className="text-gray-500 text-sm leading-relaxed max-w-xs">
                A personal entertainment companion. Discover, track, and
                experience movies and TV shows tailored to your taste.
              </p>
            </div>

            {/* Browse */}
            <div>
              <button
                type="button"
                onClick={() => toggleSection("browse")}
                className="flex items-center gap-2 mb-4 md:pointer-events-none"
              >
                <h4 className="text-sm font-semibold text-white uppercase tracking-wider">
                  Browse
                </h4>
                <ChevronDown
                  className={`w-4 h-4 text-gray-500 md:hidden transition-transform ${openSections["browse"] ? "rotate-180" : ""}`}
                />
              </button>
              <ul
                className={`space-y-2.5 ${openSections["browse"] ? "block" : "hidden"} md:block`}
              >
                <li>
                  <Link
                    href="/home"
                    className="text-gray-500 hover:text-red-500 transition-colors text-sm"
                  >
                    Home
                  </Link>
                </li>
                <li>
                  <Link
                    href="/movies"
                    className="text-gray-500 hover:text-red-500 transition-colors text-sm"
                  >
                    Movies
                  </Link>
                </li>
                <li>
                  <Link
                    href="/tv"
                    className="text-gray-500 hover:text-red-500 transition-colors text-sm"
                  >
                    TV Shows
                  </Link>
                </li>
                <li>
                  <Link
                    href="/search"
                    className="text-gray-500 hover:text-red-500 transition-colors text-sm"
                  >
                    Search
                  </Link>
                </li>
              </ul>
            </div>

            {/* Genres */}
            <div>
              <button
                type="button"
                onClick={() => toggleSection("genres")}
                className="flex items-center gap-2 mb-4 md:pointer-events-none"
              >
                <h4 className="text-sm font-semibold text-white uppercase tracking-wider">
                  Genres
                </h4>
                <ChevronDown
                  className={`w-4 h-4 text-gray-500 md:hidden transition-transform ${openSections["genres"] ? "rotate-180" : ""}`}
                />
              </button>
              <ul
                className={`space-y-2.5 ${openSections["genres"] ? "block" : "hidden"} md:block`}
              >
                <li>
                  <Link
                    href="/genre/movie/action"
                    className="text-gray-500 hover:text-red-500 transition-colors text-sm"
                  >
                    Action
                  </Link>
                </li>
                <li>
                  <Link
                    href="/genre/movie/drama"
                    className="text-gray-500 hover:text-red-500 transition-colors text-sm"
                  >
                    Drama
                  </Link>
                </li>
                <li>
                  <Link
                    href="/genre/movie/comedy"
                    className="text-gray-500 hover:text-red-500 transition-colors text-sm"
                  >
                    Comedy
                  </Link>
                </li>
                <li>
                  <Link
                    href="/genre/movie/thriller"
                    className="text-gray-500 hover:text-red-500 transition-colors text-sm"
                  >
                    Thriller
                  </Link>
                </li>
                <li>
                  <Link
                    href="/genre/movie/horror"
                    className="text-gray-500 hover:text-red-500 transition-colors text-sm"
                  >
                    Horror
                  </Link>
                </li>
              </ul>
            </div>

            {/* Account */}
            <div>
              <button
                type="button"
                onClick={() => toggleSection("account")}
                className="flex items-center gap-2 mb-4 md:pointer-events-none"
              >
                <h4 className="text-sm font-semibold text-white uppercase tracking-wider">
                  Account
                </h4>
                <ChevronDown
                  className={`w-4 h-4 text-gray-500 md:hidden transition-transform ${openSections["account"] ? "rotate-180" : ""}`}
                />
              </button>
              <ul
                className={`space-y-2.5 ${openSections["account"] ? "block" : "hidden"} md:block`}
              >
                <li>
                  <Link
                    href="/signin"
                    className="text-gray-500 hover:text-red-500 transition-colors text-sm"
                  >
                    Sign In
                  </Link>
                </li>
                <li>
                  <Link
                    href="/signup"
                    className="text-gray-500 hover:text-red-500 transition-colors text-sm"
                  >
                    Sign Up
                  </Link>
                </li>
                <li>
                  <Link
                    href="/profile"
                    className="text-gray-500 hover:text-red-500 transition-colors text-sm"
                  >
                    Profile
                  </Link>
                </li>
                <li>
                  <Link
                    href="/my-list"
                    className="text-gray-500 hover:text-red-500 transition-colors text-sm"
                  >
                    My List
                  </Link>
                </li>
              </ul>
            </div>

            {/* Socials */}
            <div>
              <button
                type="button"
                onClick={() => toggleSection("socials")}
                className="flex items-center gap-2 mb-4 md:pointer-events-none"
              >
                <h4 className="text-sm font-semibold text-white uppercase tracking-wider">
                  Socials
                </h4>
                <ChevronDown
                  className={`w-4 h-4 text-gray-500 md:hidden transition-transform ${openSections["socials"] ? "rotate-180" : ""}`}
                />
              </button>
              <ul
                className={`space-y-2.5 ${openSections["socials"] ? "block" : "hidden"} md:block`}
              >
                <li>
                  <a href="https://github.com/yassnemo" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-gray-500 hover:text-red-500 transition-colors text-sm">
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                    GitHub
                  </a>
                </li>
                <li>
                  <a href="https://x.com/yerradouanii" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-gray-500 hover:text-red-500 transition-colors text-sm">
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                    X / Twitter
                  </a>
                </li>
                <li>
                  <a href="https://instagram.com/yassnemo007" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-gray-500 hover:text-red-500 transition-colors text-sm">
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                    Instagram
                  </a>
                </li>
                <li>
                  <a href="https://linkedin.com/in/yassine-erradouani" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-gray-500 hover:text-red-500 transition-colors text-sm">
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                    LinkedIn
                  </a>
                </li>
                <li>
                  <a href="https://yerradouani.me" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-gray-500 hover:text-red-500 transition-colors text-sm">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>
                    Website
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="pt-8 border-t border-white/5">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex flex-wrap justify-center gap-6 text-xs text-gray-600">
                <Link
                  href="/privacy"
                  className="hover:text-gray-400 transition-colors"
                >
                  Privacy
                </Link>
                <Link
                  href="/terms"
                  className="hover:text-gray-400 transition-colors"
                >
                  Terms
                </Link>
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-600">
                <span>&copy; {new Date().getFullYear()} YMovies</span>
                <span className="w-px h-3 bg-gray-800" />
                <a
                  href="/humans.txt"
                  className="relative group hover:text-gray-400 transition-colors"
                >
                  Crafted by yours truly
                </a>
              </div>
            </div>

            {/* TMDB attribution — required by their terms, and it reads legit */}
            <p className="mt-6 max-w-2xl text-[11px] leading-relaxed text-gray-700">
              This product uses the TMDB API but is not endorsed or certified by
              TMDB. All title data, artwork, and ratings are provided by The
              Movie Database.
            </p>
          </div>
        </div>
      </footer>

      {/* Back to top */}
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        className={`fixed bottom-8 right-8 z-50 bg-red-600 hover:bg-red-700 text-white p-3 rounded-full transition-all duration-500 ${
          showBackToTop
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-4 pointer-events-none"
        }`}
        aria-label="Back to top"
      >
        <ArrowUp className="w-5 h-5" />
      </button>
    </div>
  );
};

export default Landing;
