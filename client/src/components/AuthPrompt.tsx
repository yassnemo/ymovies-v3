import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Link } from "wouter";
import SocialLoginButtons from "@/components/SocialLoginButtons";

const SHOW_AFTER_MS = 10000;
const STORAGE_KEY = "auth_prompt_dismissed";
const DISMISS_FOR_DAYS = 3;

const AuthPrompt = () => {
  const { isAuthenticated, isLoading, isGuest } = useAuth();
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    if (isAuthenticated || isLoading || !isGuest) return;

    const lastDismissed = localStorage.getItem(STORAGE_KEY);
    if (lastDismissed) {
      const days = (Date.now() - new Date(lastDismissed).getTime()) / 86400000;
      if (days < DISMISS_FOR_DAYS) return;
    }

    const timer = setTimeout(() => setShowPrompt(true), SHOW_AFTER_MS);
    return () => clearTimeout(timer);
  }, [isAuthenticated, isLoading, isGuest]);

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem(STORAGE_KEY, new Date().toISOString());
  };

  if (!showPrompt || isAuthenticated || isLoading) return null;

  return (
    <Dialog open={showPrompt} onOpenChange={(open) => !open && handleDismiss()}>
      <DialogContent className="bg-zinc-900 border border-zinc-800 max-w-sm rounded-2xl p-0 overflow-hidden shadow-2xl">
        {/* Image header */}
        <div className="relative h-36 overflow-hidden">
          <img
            src="/movie-posters.jpg"
            alt=""
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/30 to-transparent" />
        </div>

        {/* Body */}
        <div className="px-6 pt-1 pb-6 space-y-4">
          <div>
            <h2 className="text-lg font-bold text-white">
              There's more here for you
            </h2>
            <p className="text-zinc-400 text-sm mt-1 leading-relaxed">
              Sign up to save movies, build your watchlist, and pick up right where you left off.
            </p>
          </div>

          <div className="space-y-2">
            <Button
              className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold h-11 rounded-xl"
              asChild
            >
              <Link href="/signup">Create a free account</Link>
            </Button>

            <Button
              variant="outline"
              className="w-full border-zinc-700 bg-transparent text-white hover:bg-zinc-800 h-11 rounded-xl"
              asChild
            >
              <Link href="/signin">Sign in</Link>
            </Button>

            <button
              className="w-full text-zinc-500 hover:text-zinc-300 text-sm py-2 transition-colors"
              onClick={handleDismiss}
            >
              Not now
            </button>
          </div>

          <div className="relative flex items-center gap-3">
            <div className="flex-1 border-t border-zinc-800" />
            <span className="text-zinc-600 text-xs">or</span>
            <div className="flex-1 border-t border-zinc-800" />
          </div>

          <SocialLoginButtons showGoogle onSuccess={handleDismiss} />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AuthPrompt;
