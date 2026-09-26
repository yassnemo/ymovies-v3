import React from "react";
import { Link } from "wouter";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative z-10 mt-12 border-t border-gray-800 bg-black px-4 pb-24 pt-8 md:mt-20 md:py-12">
      <div className="container mx-auto">
        <div className="md:hidden">
          <Link href="/home" className="text-lg font-semibold tracking-tight text-white">YMovies</Link>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-gray-400">
            Discover movies and TV shows. We don't host or stream video.
          </p>
          <nav aria-label="Footer links" className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3 text-sm text-gray-300">
            <Link href="/privacy" className="hover:text-white">Privacy</Link>
            <Link href="/terms" className="hover:text-white">Terms</Link>
            <a href="https://yerradouani.me" target="_blank" rel="noopener noreferrer" className="hover:text-white">Website</a>
          </nav>
          <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-white/10 pt-4 text-xs text-gray-500">
            <span>&copy; {currentYear} YMovies</span>
            <a href="/humans.txt" className="hover:text-white">Crafted by yours truly</a>
          </div>
        </div>

        <div className="hidden md:block">
        {/* Main grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 lg:grid-cols-6 gap-8 mb-10">
          {/* About */}
          <div className="col-span-2 md:col-span-5 lg:col-span-2">
            <h3 className="font-semibold text-white text-sm uppercase tracking-wider mb-4">About</h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              Discover movies and TV shows, keep track of what you want to watch, and find where titles are available. YMovies does not host or stream video.
            </p>
          </div>

          {/* Browse */}
          <div>
            <h3 className="font-semibold text-white text-sm uppercase tracking-wider mb-4">Browse</h3>
            <ul className="space-y-2.5">
              <li>
                <Link href="/home" className="text-gray-400 hover:text-white transition-colors text-sm">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/movies" className="text-gray-400 hover:text-white transition-colors text-sm">
                  Movies
                </Link>
              </li>
              <li>
                <Link href="/tv" className="text-gray-400 hover:text-white transition-colors text-sm">
                  TV Shows
                </Link>
              </li>
              <li>
                <Link href="/search" className="text-gray-400 hover:text-white transition-colors text-sm">
                  Search
                </Link>
              </li>
            </ul>
          </div>

          {/* Genres */}
          <div>
            <h3 className="font-semibold text-white text-sm uppercase tracking-wider mb-4">Genres</h3>
            <ul className="space-y-2.5">
              <li>
                <Link href="/genre/movie/action" className="text-gray-400 hover:text-white transition-colors text-sm">
                  Action
                </Link>
              </li>
              <li>
                <Link href="/genre/movie/comedy" className="text-gray-400 hover:text-white transition-colors text-sm">
                  Comedy
                </Link>
              </li>
              <li>
                <Link href="/genre/movie/drama" className="text-gray-400 hover:text-white transition-colors text-sm">
                  Drama
                </Link>
              </li>
              <li>
                <Link href="/genre/movie/horror" className="text-gray-400 hover:text-white transition-colors text-sm">
                  Horror
                </Link>
              </li>
              <li>
                <Link href="/genre/movie/scifi" className="text-gray-400 hover:text-white transition-colors text-sm">
                  Sci-Fi
                </Link>
              </li>
              <li>
                <Link href="/genre/movie/thriller" className="text-gray-400 hover:text-white transition-colors text-sm">
                  Thriller
                </Link>
              </li>
            </ul>
          </div>

          {/* Account */}
          <div>
            <h3 className="font-semibold text-white text-sm uppercase tracking-wider mb-4">Account</h3>
            <ul className="space-y-2.5">
              <li>
                <Link href="/signin" className="text-gray-400 hover:text-white transition-colors text-sm">
                  Sign In
                </Link>
              </li>
              <li>
                <Link href="/signup" className="text-gray-400 hover:text-white transition-colors text-sm">
                  Sign Up
                </Link>
              </li>
              <li>
                <Link href="/profile" className="text-gray-400 hover:text-white transition-colors text-sm">
                  Profile
                </Link>
              </li>
              <li>
                <Link href="/my-list" className="text-gray-400 hover:text-white transition-colors text-sm">
                  My List
                </Link>
              </li>
              <li>
                <Link href="/settings" className="text-gray-400 hover:text-white transition-colors text-sm">
                  Settings
                </Link>
              </li>
            </ul>
          </div>

          {/* Socials */}
          <div>
            <h3 className="font-semibold text-white text-sm uppercase tracking-wider mb-4">Socials</h3>
            <ul className="space-y-2.5">
              <li>
                <a href="https://github.com/yassnemo" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm">
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                  GitHub
                </a>
              </li>
              <li>
                <a href="https://x.com/yerradouanii" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm">
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                  X / Twitter
                </a>
              </li>
              <li>
                <a href="https://instagram.com/yassnemo007" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm">
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                  Instagram
                </a>
              </li>
              <li>
                <a href="https://linkedin.com/in/yassine-erradouani" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm">
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                  LinkedIn
                </a>
              </li>
              <li>
                <a href="https://yerradouani.me" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>
                  Website
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom divider + legal */}
        <div className="pt-8 border-t border-gray-800">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-gray-500 text-xs">&copy; {currentYear} YMovies. All rights reserved.</p>
            <div className="flex items-center gap-4">
              <Link href="/privacy" className="text-gray-500 hover:text-white transition-colors text-xs">
                Privacy
              </Link>
              <Link href="/terms" className="text-gray-500 hover:text-white transition-colors text-xs">
                Terms
              </Link>
              <span className="w-px h-3 bg-gray-700" />
              <a
                href="/humans.txt"
                className="text-gray-500 hover:text-white transition-colors text-xs"
              >
                Crafted by yours truly
              </a>
            </div>
          </div>
        </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
