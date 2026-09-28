import React, { useEffect, useRef, useState } from "react";
import { Check, Heart, Play, Plus, Star } from "lucide-react";
import { Movie } from "@/types/movie";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface MovieDetailIntroProps {
  movie: Movie;
  hasTrailer: boolean;
  inWatchlist: boolean;
  favorite: boolean;
  onTrailer: () => void;
  onWatchlist: () => void;
  onFavorite: () => void;
}

const formatRuntime = (minutes: number) => {
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return hours ? `${hours}h ${remaining}m` : `${remaining}m`;
};

export function MovieDetailIntroSkeleton() {
  return (
    <section aria-label="Loading movie details" aria-busy="true" className="bg-gradient-to-b from-white/[0.04] to-background pb-8 pt-64 lg:pt-72">
      <div className="mx-auto max-w-[1440px] px-6 lg:px-16">
        <Skeleton className="mx-auto mb-4 h-10 w-3/4 max-w-lg lg:mx-0" />
        <Skeleton className="mx-auto mb-6 h-4 w-40 lg:mx-0" />
        <div className="mb-8 flex justify-center gap-3 lg:justify-start">
          <Skeleton className="h-11 w-36 rounded-full" />
          <Skeleton className="h-11 w-11 rounded-full" />
          <Skeleton className="h-11 w-11 rounded-full" />
        </div>
        <Skeleton className="mb-4 h-4 w-40" />
        <Skeleton className="mb-2 h-4 w-full max-w-2xl" />
        <Skeleton className="h-4 w-4/5 max-w-xl" />
      </div>
    </section>
  );
}

export default function MovieDetailIntro({ movie, hasTrailer, inWatchlist, favorite, onTrailer, onWatchlist, onFavorite }: MovieDetailIntroProps) {
  const [expanded, setExpanded] = useState(false);
  const [canExpand, setCanExpand] = useState(false);
  const overviewRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    const overview = overviewRef.current;
    if (!overview || expanded) return;
    const measure = () => setCanExpand(overview.scrollHeight > overview.clientHeight + 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(overview);
    return () => observer.disconnect();
  }, [movie.overview, expanded]);
  const releaseDate = movie.release_date ? new Date(`${movie.release_date}T12:00:00`) : null;
  const validDate = releaseDate && !Number.isNaN(releaseDate.getTime()) ? releaseDate : null;
  const director = movie.credits?.crew?.filter(person => person.job === "Director").map(person => person.name).join(", ");
  const artwork = movie.backdrop_path || movie.poster_path;
  const facts = [
    movie.runtime ? { label: "Runtime", value: formatRuntime(movie.runtime) } : null,
    movie.original_language ? { label: "Language", value: movie.original_language.toUpperCase() } : null,
    validDate ? { label: "Release date", value: validDate.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) } : null,
  ].filter((fact): fact is { label: string; value: string } => fact !== null);

  return (
    <section aria-labelledby="movie-title" className="relative isolate pb-8 pt-64 lg:pb-12 lg:pt-72">
      <div aria-hidden="true" className="absolute inset-0 -z-10 overflow-hidden">
        {artwork && <img src={`https://image.tmdb.org/t/p/w1280${artwork}`}
          srcSet={`https://image.tmdb.org/t/p/w780${artwork} 780w, https://image.tmdb.org/t/p/w1280${artwork} 1280w`}
          sizes="100vw" alt="" fetchPriority="high" className="h-full w-full object-cover object-[center_20%]" />}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/75 to-background/10" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/60 via-transparent to-background/10" />
      </div>

      <div className="mx-auto max-w-[1440px] px-6 lg:px-16">
        <header className="text-center lg:text-left">
          <h1 id="movie-title" className="mx-auto max-w-3xl text-page-title font-semibold tracking-tight text-white [text-wrap:balance] lg:mx-0 lg:text-5xl">{movie.title}</h1>
          {movie.genres && movie.genres.length > 0 && <div className="mt-3 flex flex-wrap justify-center gap-x-2 gap-y-1 text-body text-gray-300 lg:justify-start">
            {movie.genres.map((genre, index) => <React.Fragment key={genre.id}>
              {index > 0 && <span aria-hidden="true" className="text-gray-500">&middot;</span>}
              <span>{genre.name}</span>
            </React.Fragment>)}
          </div>}
          <div className="mt-6 flex items-center justify-center gap-3 lg:justify-start">
            <Button onClick={onTrailer} disabled={!hasTrailer} className="h-11 rounded-full bg-white px-6 text-body font-semibold text-black hover:bg-gray-200 active:scale-95">
              <Play className="mr-1.5 h-4 w-4 fill-current" />{hasTrailer ? "Play trailer" : "No trailer"}
            </Button>
            <Button variant="outline" size="icon" onClick={onWatchlist} aria-pressed={inWatchlist}
              aria-label={inWatchlist ? "Remove from watchlist" : "Add to watchlist"}
              className="h-11 w-11 rounded-full border-white/15 bg-white/[0.08] text-white backdrop-blur-sm hover:bg-white/15 active:scale-95">
              {inWatchlist ? <Check className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
            </Button>
            <Button variant="outline" size="icon" onClick={onFavorite} aria-pressed={favorite}
              aria-label={favorite ? "Remove from favorites" : "Add to favorites"}
              className={`h-11 w-11 rounded-full border-white/15 backdrop-blur-sm active:scale-95 ${favorite ? "bg-red-600 text-white hover:bg-red-700" : "bg-white/[0.08] text-white hover:bg-white/15"}`}>
              <Heart className={`h-4 w-4 ${favorite ? "fill-current" : ""}`} />
            </Button>
          </div>
        </header>

        <div className="mt-7 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_280px] lg:gap-16">
          <div className="max-w-2xl">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-body font-medium text-gray-300">
              {validDate && <span>{validDate.getFullYear()}</span>}
              {movie.runtime && <span>{formatRuntime(movie.runtime)}</span>}
              {movie.adult && <span className="rounded border border-white/25 px-1.5 text-caption">18+</span>}
              {movie.vote_average > 0 && <span aria-label={`Rating ${movie.vote_average.toFixed(1)} out of 10`} className="inline-flex items-center gap-1.5">
                <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />{movie.vote_average.toFixed(1)}<span className="text-caption text-gray-500">/ 10</span>
              </span>}
            </div>
            {director && <p className="mt-3 text-body text-gray-300"><span className="text-gray-500">Director: </span>{director}</p>}
            <p ref={overviewRef} id="movie-overview" className={`mt-5 text-body leading-relaxed text-gray-300 ${expanded ? "" : "line-clamp-3"}`}>{movie.overview || "A synopsis is not available yet."}</p>
            {canExpand && <button type="button" aria-expanded={expanded} aria-controls="movie-overview"
              onClick={() => setExpanded(value => !value)} className="mt-1.5 min-h-9 text-body font-medium text-white/70 transition-colors hover:text-white">
              {expanded ? "Show less" : "Read more"}
            </button>}
          </div>
          {facts.length > 0 && <dl className="overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03] text-caption backdrop-blur-sm">
            {facts.map(fact => <div key={fact.label} className="flex items-center justify-between gap-4 border-b border-white/[0.06] px-4 py-3 last:border-b-0">
              <dt className="text-gray-500">{fact.label}</dt><dd className="text-right font-medium text-gray-200">{fact.value}</dd>
            </div>)}
          </dl>}
        </div>
      </div>
    </section>
  );
}
