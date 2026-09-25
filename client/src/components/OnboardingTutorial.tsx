import React, { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { ChevronRight, ChevronLeft, Check, Clapperboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";

interface OnboardingStep {
  id: number;
  title: string;
  description: string;
  element?: string;
}

const TUTORIAL_SEEN_KEY = "tutorial_seen";

const STEPS: OnboardingStep[] = [
  {
    id: 1,
    title: "Welcome to YMovies",
    description:
      "Discover movies and TV shows tailored to your taste. We'll walk you through the key features.",
  },
  {
    id: 2,
    title: "Browse & Discover",
    description:
      "Explore trending, popular, and top-rated titles. Use the search bar for anything specific, or browse by genre.",
    element: ".movie-card",
  },
  {
    id: 3,
    title: "Build Your Watchlist",
    description:
      "Tap the bookmark icon on any title to save it for later. You'll find your full list under My List.",
    element: ".watchlist-button",
  },
  {
    id: 4,
    title: "Personalized Recommendations",
    description:
      "The more you watch and rate, the smarter your recommendations get. Rate movies to fine-tune your feed.",
  },
  {
    id: 5,
    title: "You're All Set",
    description:
      "Start exploring — your personalized home page is ready. You can always revisit this guide from Settings.",
  },
];

export function OnboardingTutorial() {
  const { isAuthenticated } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const seen = localStorage.getItem(TUTORIAL_SEEN_KEY);
    if (!seen && isAuthenticated) {
      const timer = setTimeout(() => setIsOpen(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated]);

  const complete = useCallback(() => {
    localStorage.setItem(TUTORIAL_SEEN_KEY, "true");
    setIsOpen(false);
    setCurrentStep(0);
  }, []);

  const next = useCallback(() => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      complete();
    }
  }, [currentStep, complete]);

  const prev = useCallback(() => {
    if (currentStep > 0) setCurrentStep((s) => s - 1);
  }, [currentStep]);

  if (!isOpen) return null;

  const step = STEPS[currentStep];
  const isLast = currentStep === STEPS.length - 1;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) complete(); }}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-md gap-0 overflow-hidden rounded-2xl border border-white/10 bg-[#0b0b0b] p-0 text-white shadow-2xl">
        {/* Cinematic red glow header */}
        <div className="relative px-6 pt-7 pb-5 sm:px-7">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-red-950/40 to-transparent" />
          <DialogHeader className="relative space-y-3 text-left">
            <div className="flex items-center gap-2 text-red-500 text-[11px] font-semibold uppercase tracking-[0.25em]">
              <Clapperboard className="h-3.5 w-3.5" />
              Step {currentStep + 1} of {STEPS.length}
            </div>
            <DialogTitle className="font-logo text-3xl tracking-wide sm:text-4xl">
              {step.title}
            </DialogTitle>
            <DialogDescription className="text-sm leading-relaxed text-gray-400 sm:text-base">
              {step.description}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="px-6 sm:px-7">
          {/* Progress dots */}
          <div className="flex items-center gap-1.5">
            {STEPS.map((_, index) => (
              <span
                key={index}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  index === currentStep
                    ? "w-7 bg-red-600"
                    : index < currentStep
                      ? "w-1.5 bg-red-600/40"
                      : "w-1.5 bg-white/15"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Footer — primary action prominent on mobile, inline on desktop */}
        <div className="mt-6 flex flex-col-reverse gap-3 border-t border-white/10 bg-white/[0.02] px-6 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={prev}
              disabled={currentStep === 0}
              className="flex-1 rounded-sm border-white/20 bg-transparent text-white hover:bg-white/10 disabled:opacity-40 sm:flex-none"
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              Back
            </Button>
            <Button
              variant="ghost"
              onClick={complete}
              className="flex-1 rounded-sm text-gray-400 hover:bg-white/5 hover:text-white sm:flex-none"
            >
              Skip
            </Button>
          </div>

          <Button
            onClick={next}
            className="w-full rounded-sm bg-red-600 font-medium text-white hover:bg-red-700 sm:w-auto"
          >
            {isLast ? (
              <>
                Get Started
                <Check className="ml-1 h-4 w-4" />
              </>
            ) : (
              <>
                Next
                <ChevronRight className="ml-1 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}