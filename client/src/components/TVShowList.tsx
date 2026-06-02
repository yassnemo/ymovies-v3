import React from "react";
import TVShowCard from "./TVShowCard";
import { TVShow } from "@/types/tvshow";

interface TVShowListProps {
  title: string;
  shows: TVShow[];
  className?: string;
}

const TVShowList = ({ title, shows, className }: TVShowListProps) => {
  
  if (!shows || shows.length === 0) return null;
  
  return (
    <div className={className}>
      {title && <h2 className="text-lg md:text-2xl font-bold mb-6">{title}</h2>}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 place-items-center">
        {(shows || []).slice(0, 20).map((show) => (
          <div key={show.id} className="w-56">
            <TVShowCard show={show} className="w-full" />
          </div>
        ))}
      </div>
    </div>
  );
};

export default TVShowList;
