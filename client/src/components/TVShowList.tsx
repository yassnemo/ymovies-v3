import React from "react";
import TVShowCard from "./TVShowCard";
import { TVShow } from "@/types/tvshow";

interface TVShowListProps {
  title: string;
  shows: TVShow[];
  className?: string;
}

const TVShowList = ({ title, shows, className }: TVShowListProps) => (
  <div className={className}>
    {title && <h2 className="text-section-title font-bold mb-4">{title}</h2>}
    <div className="media-grid">
      {shows.map(show => <TVShowCard key={show.id} show={show} />)}
    </div>
  </div>
);

export default TVShowList;
