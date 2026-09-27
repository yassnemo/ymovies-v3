import React from "react";
import MovieCard from "./MovieCard";
import { Movie } from "@/types/movie";

interface MovieListProps {
  title: string;
  movies: Movie[];
  className?: string;
}

const MovieList = ({ title, movies, className }: MovieListProps) => (
  <div className={className}>
    {title && <h2 className="text-section-title font-bold mb-4">{title}</h2>}
    <div className="media-grid">
      {movies.map(movie => <MovieCard key={movie.id} movie={movie} />)}
    </div>
  </div>
);

export default MovieList;
