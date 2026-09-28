import React, { useEffect } from "react";
import { Link } from "wouter";
import { ArrowRight, Film, Play, Tv } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import "./Landing.css";

// Replace these local images to update the landing artwork without changing the layout.
const APP_PREVIEW = "/images/landing/app-preview.jpg";
const BACKGROUND_ARTWORK = "/images/sign-background-large.jpg";

export default function Landing() {
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    const previousTitle = document.title;
    document.title = "YMovies — Your next great watch";
    document.body.classList.add("ymovies-landing");
    return () => {
      document.title = previousTitle;
      document.body.classList.remove("ymovies-landing");
    };
  }, []);

  return (
    <div className="landing-shell">
      <a className="landing-skip" href="#landing-title">Skip to content</a>

      <div className="landing-artwork" aria-hidden="true">
        <img src={BACKGROUND_ARTWORK} alt="" decoding="async" />
      </div>

      <main className="landing-main">
        <section className="landing-copy" aria-labelledby="landing-title">
          <Link href="/" className="landing-brand" aria-label="YMovies home">
            <img src="/logo.png" width="56" height="56" alt="" />
            <span>YMovies</span>
          </Link>

          <h1 id="landing-title" tabIndex={-1}>Your next<br />great watch.</h1>
          <p className="landing-description">
            Discover movies and shows. Keep your watchlist and episode progress in one place.
          </p>

          <div className="landing-actions">
            <Link href="/home" className="landing-primary">
              <Play size={17} fill="currentColor" aria-hidden="true" />
              Explore YMovies
              <ArrowRight size={17} aria-hidden="true" />
            </Link>
            {!isAuthenticated && <Link href="/signin" className="landing-signin">Sign in</Link>}
          </div>
          <p className="landing-note">No account needed to explore.</p>
        </section>

        <section className="landing-preview" aria-label="YMovies app preview">
          <div className="landing-phone">
            <div className="landing-phone-screen">
              <img src={APP_PREVIEW} width="390" height="844" fetchPriority="high"
                alt="YMovies movie catalogue with filters, movie cards, and mobile navigation" />
            </div>
          </div>
          <p className="landing-preview-caption">
            <Film size={18} aria-hidden="true" />
            <Tv size={19} aria-hidden="true" />
            <span>Movies &amp; TV shows</span>
          </p>
        </section>
      </main>

      <footer className="landing-footer">
        <nav aria-label="Landing footer">
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <a href="https://yerradouani.me" target="_blank" rel="noopener noreferrer">Website</a>
        </nav>
        <p>Crafted by <a href="https://yerradouani.me" target="_blank" rel="noopener noreferrer">yassineerradouani</a></p>
        <span className="landing-copyright">&copy; {new Date().getFullYear()} YMovies</span>
      </footer>
    </div>
  );
}
