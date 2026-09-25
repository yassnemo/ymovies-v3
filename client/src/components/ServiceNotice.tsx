import { useState } from "react";
import { Info } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const NOTICE_KEY = "ymovies-service-notice-2026-09";

export function useServiceNotice() {
  const [isOpen, setIsOpen] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return localStorage.getItem(NOTICE_KEY) !== "dismissed";
    } catch {
      return true;
    }
  });

  const dismiss = () => {
    setIsOpen(false);
    try {
      localStorage.setItem(NOTICE_KEY, "dismissed");
    } catch {
      // The notice can still be dismissed when storage is unavailable.
    }
  };

  return { isOpen, dismiss };
}

export function ServiceNotice({ isOpen, onDismiss }: { isOpen: boolean; onDismiss: () => void }) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onDismiss(); }}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-md rounded-2xl border border-white/10 bg-zinc-950 p-6 text-white shadow-2xl sm:p-8">
        <DialogHeader className="space-y-4 text-left">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-600/15 text-red-400">
            <Info className="h-6 w-6" aria-hidden="true" />
          </div>
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-400">Service update</p>
            <DialogTitle className="text-2xl font-bold leading-tight text-white">A note about YMovies</DialogTitle>
          </div>
          <DialogDescription asChild>
            <div className="space-y-4 text-sm leading-relaxed text-zinc-300">
              <p>
                Recent traffic has made the cloud service behind our recommendation engine too expensive for me to keep running. I have taken it offline, so personalized recommendations are currently unavailable.
              </p>
              <p>
                YMovies helps you discover and track titles. We do not host or stream movies or TV shows, and we do not provide pirated content.
              </p>
              <p>Thanks for understanding and for using the site.</p>
            </div>
          </DialogDescription>
        </DialogHeader>
        <button
          type="button"
          onClick={onDismiss}
          className="mt-2 inline-flex h-11 w-full items-center justify-center rounded-xl bg-red-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
        >
          Got it
        </button>
      </DialogContent>
    </Dialog>
  );
}
