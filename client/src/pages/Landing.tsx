import React, { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { Film, Play, Tv } from "lucide-react";
import { useReducedMotion } from "framer-motion";
import "./Landing.css";

// Replace these local assets to change the preview without changing the phone frame.
const APP_PREVIEW = "/images/landing/app-preview.jpg";
const APP_PREVIEW_VIDEO = "/images/landing/app-preview.webm";
const BACKGROUND_ARTWORK = "/images/sign-background-large.jpg";
const BACKGROUND_PLACEHOLDER = "/images/sign-background-large-placeholder.jpg";

function LandingFooter({ mobile = false }: { mobile?: boolean }) {
  return (
    <footer className={mobile ? "landing-footer landing-footer-mobile" : "landing-footer"}>
      <nav aria-label="Landing footer">
        <Link href="/privacy">Privacy</Link>
        <Link href="/terms">Terms</Link>
        <a href="https://yerradouani.me" target="_blank" rel="noopener noreferrer">Website</a>
        <a className="landing-creator" href="https://yerradouani.me" target="_blank" rel="noopener noreferrer">
          Crafted by Yassine Erradouani
        </a>
      </nav>
    </footer>
  );
}

export default function Landing() {
  const reduceMotion = useReducedMotion();
  const [artworkReady, setArtworkReady] = useState(false);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const artworkRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = "YMovies — Find your next favorite";
    document.body.classList.add("ymovies-landing");
    if (artworkRef.current?.complete && artworkRef.current.naturalWidth > 0) setArtworkReady(true);
    return () => {
      document.title = previousTitle;
      document.body.classList.remove("ymovies-landing");
    };
  }, []);

  return (
    <main className="landing-shell">
      <a className="landing-skip" href="#landing-title">Skip to content</a>

      <section className="landing-hero" aria-labelledby="landing-title">
        <div className="landing-copy">
          <Link href="/" className="landing-brand" aria-label="YMovies home">
            <img src="/logo.png" width="62" height="50" alt="" />
            <span>YMovies</span>
          </Link>
          <h1 id="landing-title" tabIndex={-1}>Find your next favorite</h1>
          <p className="landing-description">
            Discover movies and TV shows. Track your watchlist, favorites, and episode progress.
          </p>
          <div className="landing-actions">
            <Link href="/home" className="landing-primary">
              <span className="landing-button-fill" aria-hidden="true" />
              <span className="landing-button-content">
                <Play size={24} fill="currentColor" aria-hidden="true" />
                <span>Explore YMovies</span>
              </span>
            </Link>
          </div>
        </div>
        <LandingFooter />
      </section>

      <section className="landing-preview" aria-label="YMovies app preview">
        <div className="landing-phone-reveal">
          <div className="landing-phone">
            <div className="landing-phone-screen">
              {!reduceMotion && <video autoPlay muted loop playsInline preload="metadata" poster={APP_PREVIEW}
                aria-label="A preview of browsing movies and opening movie details in YMovies"
                onPlaying={() => setVideoPlaying(true)} onError={() => setVideoPlaying(false)}>
                <source src={APP_PREVIEW_VIDEO} type="video/webm" />
              </video>}
              <img className={videoPlaying && !reduceMotion ? "landing-phone-placeholder is-hidden" : "landing-phone-placeholder"}
                src={APP_PREVIEW} width="360" height="640" fetchPriority="high"
                alt="YMovies movie catalogue with filters, movie cards, and mobile navigation" />
            </div>
          </div>
        </div>

        <div className="landing-preview-caption">
          <div className="landing-preview-icons" aria-hidden="true">
            <Film size={24} strokeWidth={1.75} />
            <Tv size={24} strokeWidth={1.75} />
          </div>
          <p>Movies &amp; TV shows</p>
        </div>

        <div className="landing-artwork" aria-hidden="true">
          <div className="landing-artwork-picture">
            <img className={artworkReady ? "landing-artwork-placeholder is-hidden" : "landing-artwork-placeholder"}
              src={BACKGROUND_PLACEHOLDER} alt="" />
            <img ref={artworkRef} className={artworkReady ? "landing-artwork-image is-ready" : "landing-artwork-image"}
              src={BACKGROUND_ARTWORK} alt="" decoding="async" onLoad={() => setArtworkReady(true)} />
          </div>
          <svg className="landing-angle landing-angle-top" viewBox="0 0 100 100" preserveAspectRatio="none">
            <polygon points="0 0, 100 0, 100 100" />
          </svg>
          <div className="landing-artwork-cover">
            <div className="landing-artwork-mask" />
            <svg className="landing-angle" viewBox="0 0 100 100" preserveAspectRatio="none">
              <polygon points="0 0, 0 100, 100 100" />
            </svg>
          </div>
        </div>
      </section>

      <LandingFooter mobile />
    </main>
  );
}
