import { HTMLAttributes } from "react";
import React from 'react';
import { cn } from "@/lib/utils";

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "card" | "banner" | "text" | "avatar" | "button" | "movie-card" | "tv-card" | "hero-banner" | "slider-title";
  count?: number;
  className?: string;
}

/** A single glowing bar / block used everywhere */
const Bone = ({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) => (
  <div
    className={cn(
      "relative overflow-hidden rounded bg-white/[0.06] animate-skeleton-breathe",
      className,
    )}
    style={style}
  >
    {/* shimmer sweep */}
    <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/[0.04] to-transparent" />
  </div>
);

export function LoadingSkeleton({
  variant = "card",
  count = 1,
  className,
  ...props
}: SkeletonProps) {
  const renderSkeleton = () => {
    switch (variant) {
      case "movie-card":
      case "tv-card":
        return (
          <div className="space-y-4">
            {Array.from({ length: count }).map((_, i) => (
              <div key={i} className={cn("media-card-slot", className)} {...props}>
                <div className="relative aspect-[2/3] overflow-hidden rounded-xl">
                  <Bone className="absolute inset-0 rounded-xl" style={{ animationDelay: `${i * 120}ms` }} />
                  <Bone className="absolute left-2 top-2 h-5 w-5 rounded-full" />
                </div>
                <div className="mt-3 px-0.5">
                  <Bone className="h-5 w-3/4" />
                  <div className="mt-1 flex h-4 justify-between">
                    <Bone className="h-4 w-8" /><Bone className="h-4 w-8" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        );

      case "hero-banner":
        return (
          <div
            className={cn("relative w-full overflow-hidden", className)}
            style={{
              height: typeof window !== "undefined" && window.innerWidth <= 768
                ? "calc(85vh - 70px)"
                : "100vh",
            }}
            {...props}
          >
            {/* background */}
            <Bone className="absolute inset-0 rounded-none" />

            {/* content */}
            <div className="absolute bottom-0 left-0 right-0 p-8 md:p-16 space-y-5">
              <div className="flex gap-2">
                <Bone className="w-12 h-5 rounded-sm" />
                <Bone className="w-16 h-5 rounded-sm" />
              </div>
              <Bone className="h-10 md:h-14 w-3/4 md:w-1/2 rounded" />
              <Bone className="h-7 md:h-10 w-1/2 md:w-1/3 rounded" />
              <div className="max-w-2xl space-y-2">
                <Bone className="h-3.5 w-full rounded-sm" />
                <Bone className="h-3.5 w-5/6 rounded-sm" />
              </div>
              <div className="flex gap-3 pt-4">
                <Bone className="w-28 h-10 rounded-full" />
                <Bone className="w-32 h-10 rounded-full" />
              </div>
            </div>

            {/* gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent pointer-events-none" />
          </div>
        );

      case "slider-title":
        return (
          <div className="flex items-center gap-4 mb-4">
            <Bone className="h-7 w-44 rounded" />
            <div className="flex-1 h-px bg-white/[0.04]" />
          </div>
        );

      case "card":
        return (
          <div className="space-y-6">
            {Array.from({ length: count }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "relative w-40 md:w-48 aspect-[2/3] rounded-md overflow-hidden",
                  className,
                )}
                {...props}
              >
                <Bone className="absolute inset-0" style={{ animationDelay: `${i * 100}ms` }} />
                <div className="absolute bottom-0 inset-x-0 p-3 space-y-1.5">
                  <Bone className="h-3 w-3/4 rounded-sm" />
                  <Bone className="h-2 w-1/2 rounded-sm" />
                </div>
              </div>
            ))}
          </div>
        );

      case "banner":
        return (
          <div
            className={cn(
              "relative w-full aspect-[21/9] md:aspect-[21/7] rounded-lg overflow-hidden",
              className,
            )}
            {...props}
          >
            <Bone className="absolute inset-0 rounded-lg" />
            <div className="absolute bottom-8 left-8 right-8 space-y-3">
              <Bone className="h-7 w-1/3 rounded" />
              <Bone className="h-4 w-2/3 rounded-sm" />
              <Bone className="h-4 w-1/2 rounded-sm" />
              <Bone className="h-9 w-28 mt-3 rounded" />
            </div>
          </div>
        );

      case "text":
        return (
          <div className="space-y-2.5">
            {Array.from({ length: count }).map((_, i) => (
              <Bone
                key={i}
                className={cn("h-3.5 rounded-sm", className)}
                style={{
                  width: `${65 + (i * 17) % 35}%`,
                  animationDelay: `${i * 80}ms`,
                }}
              />
            ))}
          </div>
        );

      case "avatar":
        return (
          <Bone
            className={cn("h-10 w-10 rounded-full", className)}
          />
        );

      case "button":
        return (
          <Bone
            className={cn("h-10 w-24 rounded-md", className)}
          />
        );

      default:
        return null;
    }
  };

  return renderSkeleton();
}
