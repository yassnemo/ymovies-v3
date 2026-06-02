import React, { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { UserIcon, ChevronRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogTitle,
  DialogDescription,
  DialogHeader,
} from "@/components/ui/dialog";
import SocialLoginButtons from "@/components/SocialLoginButtons";

const NavAuthButton = () => {
  const { isAuthenticated } = useAuth();
  const [open, setOpen] = useState(false);

  if (isAuthenticated) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="default"
          size="sm"
          className="bg-red-600 hover:bg-red-700 transition-all duration-200 flex items-center font-semibold"
        >
          <UserIcon className="mr-2 h-4 w-4" />
          Sign In
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-sm w-[90vw] bg-zinc-950 border border-zinc-800 text-white shadow-2xl p-0 overflow-hidden">
        <div className="px-6 pt-7 pb-6 space-y-5">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-xl font-bold text-white">
              Sign in to YMovies
            </DialogTitle>
            <DialogDescription className="text-zinc-400 text-sm">
              Save movies, track what you watch, build your list.
            </DialogDescription>
          </DialogHeader>

          <SocialLoginButtons showGoogle={true} onSuccess={() => setOpen(false)} />

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-zinc-800" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-zinc-950 px-3 text-xs text-zinc-500">or</span>
            </div>
          </div>

          <div className="space-y-2">
            <Button
              onClick={() => { setOpen(false); window.location.href = "/signin"; }}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold flex items-center justify-center gap-2"
            >
              Sign in with email
              <ChevronRight className="h-4 w-4" />
            </Button>

            <Button
              onClick={() => { setOpen(false); window.location.href = "/signup"; }}
              variant="outline"
              className="w-full border-zinc-700 bg-transparent hover:bg-zinc-800 text-zinc-300 hover:text-white font-medium"
            >
              Create account
            </Button>
          </div>

          <p className="text-center text-[11px] text-zinc-600">
            By continuing you agree to our{" "}
            <a href="/terms" className="text-zinc-400 hover:text-white underline underline-offset-2">Terms</a>
            {" "}and{" "}
            <a href="/privacy" className="text-zinc-400 hover:text-white underline underline-offset-2">Privacy Policy</a>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NavAuthButton;
