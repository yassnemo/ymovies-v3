import React, { useState, useCallback } from "react";
import { Play, X, Volume2, VolumeX, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TrailerPlayerProps {
  videoKey: string;
  title: string;
  onClose?: () => void;
  inline?: boolean;
}

const TrailerPlayer = ({ videoKey, title, onClose, inline = false }: TrailerPlayerProps) => {
  const [isPlaying, setIsPlaying] = useState(inline);
  const [isMuted, setIsMuted] = useState(false);

  const handlePlay = useCallback(() => {
    setIsPlaying(true);
  }, []);

  const handleFullscreen = useCallback(() => {
    const iframe = document.querySelector(`iframe[data-trailer-key="${videoKey}"]`) as HTMLIFrameElement;
    if (iframe?.requestFullscreen) {
      iframe.requestFullscreen();
    }
  }, [videoKey]);

  if (!isPlaying) {
    return (
      <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden group cursor-pointer" onClick={handlePlay}>
        <img
          src={`https://img.youtube.com/vi/${videoKey}/maxresdefault.jpg`}
          alt={title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          onError={(e) => {
            e.currentTarget.src = `https://img.youtube.com/vi/${videoKey}/hqdefault.jpg`;
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-full p-5 transition-all duration-300 group-hover:scale-110 group-hover:bg-white/20">
            <Play className="h-10 w-10 text-white fill-white" />
          </div>
        </div>
        <div className="absolute bottom-4 left-4 right-4">
          <p className="text-white font-medium text-sm line-clamp-1">{title}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative w-full aspect-video bg-black ${inline ? "rounded-lg" : ""} overflow-hidden`}>
      <iframe
        data-trailer-key={videoKey}
        src={`https://www.youtube.com/embed/${videoKey}?autoplay=1&rel=0&modestbranding=1&mute=${isMuted ? 1 : 0}`}
        className="w-full h-full"
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
      <div className="absolute top-3 right-3 flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-11 w-11 bg-black/60 hover:bg-black/80 text-white rounded-full"
          aria-label={isMuted ? "Unmute trailer" : "Mute trailer"}
          onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); }}
        >
          {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-11 w-11 bg-black/60 hover:bg-black/80 text-white rounded-full"
          aria-label="Fullscreen trailer"
          onClick={(e) => { e.stopPropagation(); handleFullscreen(); }}
        >
          <Maximize2 className="h-4 w-4" />
        </Button>
        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            className="h-11 w-11 bg-black/60 hover:bg-black/80 text-white rounded-full"
            aria-label="Close trailer"
            onClick={(e) => { e.stopPropagation(); onClose(); }}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
};

export default TrailerPlayer;
