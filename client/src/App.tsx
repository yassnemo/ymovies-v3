import React from 'react';
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
// Using relative paths for all components
import { Toaster } from "./components/ui/toaster";
import { TooltipProvider } from "./components/ui/tooltip";
import { ThemeProvider } from "./components/ui/theme-provider";
import NotFound from "./pages/not-found";
import Landing from "./pages/Landing";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import { OnboardingTutorial } from "./components/OnboardingTutorial";
import { LoadingSkeleton } from "./components/LoadingSkeleton";
import { LoadingScreen } from "./components/ui/LoadingScreen";
import PageTransition from "./components/ui/PageTransition";
import { useAuth } from "./hooks/useAuth";
import { AuthProvider } from "./components/AuthProvider";
import { UserPreferencesProvider } from "./hooks/useUserPreferences";
import { Suspense, lazy, useEffect, useState } from "react";
import AuthPrompt from "./components/AuthPrompt";
import { ServiceNotice, useServiceNotice } from "./components/ServiceNotice";

// Lazily load pages for better performance
const LazyHome = lazy(() => import("./pages/Home"));
const LazyMovieDetail = lazy(() => import("./pages/MovieDetail"));
const LazyTVShowDetail = lazy(() => import("./pages/TVShowDetail"));
const LazyTVShows = lazy(() => import("./pages/TVShows"));
const LazyMovies = lazy(() => import("./pages/Movies"));
const LazySearch = lazy(() => import("./pages/Search"));
const LazyGenre = lazy(() => import("./pages/Genre"));
const LazyProfile = lazy(() => import("./pages/Profile"));
const LazyMyList = lazy(() => import("./pages/MyList"));
const LazySettings = lazy(() => import("./pages/Settings"));
const LazyApiTest = lazy(() => import("./pages/ApiTest"));
const LazySignIn = lazy(() => import("./pages/SignIn"));
const LazySignUp = lazy(() => import("./pages/SignUp"));
const LazyResetPassword = lazy(() => import("./pages/ResetPassword"));
const LazyConfirmResetPassword = lazy(() => import("./pages/ConfirmResetPassword"));
const LazyAuthCallback = lazy(() => import("./pages/AuthCallback"));
const LazyVerifyEmail = lazy(() => import("./pages/VerifyEmail"));
const LazyPrivacy = lazy(() => import("./pages/Privacy"));
const LazyTerms = lazy(() => import("./pages/Terms"));

function Router({ noticeOpen }: { noticeOpen: boolean }) {
  const { isAuthenticated, isLoading, isError } = useAuth();
  const [location] = useLocation();

  // Scroll to top on every route change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location]);

  const isLandingPage = location === '/';

  if (isLoading && !isError) {
    return <LoadingScreen />;
  }

  if (isLandingPage) {
    return <Landing />;
  }

  return (
    <>
      <Navbar />
      {!noticeOpen && <OnboardingTutorial />}
      {!noticeOpen && <AuthPrompt />}
      {/* PageTransition wraps Suspense so the crossfade fires immediately on navigation,
          even while a lazy chunk is still loading. */}
      <PageTransition routeKey={location}>
        <Suspense fallback={<LoadingFallback />}>
          <Switch>
            <Route path="/home" component={LazyHome} />
            <Route path="/search" component={LazySearch} />
            <Route path="/movie/:id" component={LazyMovieDetail} />
            <Route path="/movies" component={LazyMovies} />
            <Route path="/tv" component={LazyTVShows} />
            <Route path="/tv/:id" component={LazyTVShowDetail} />
            <Route path="/genre/:mediaType/:genre" component={LazyGenre} />
            <Route path="/api-test" component={LazyApiTest} />
            <Route path="/profile">
              {isAuthenticated ? <LazyProfile /> :
                <AuthRequired message="Please log in to view your profile" />
              }
            </Route>
            <Route path="/my-list">
              {isAuthenticated ? <LazyMyList /> :
                <AuthRequired message="Please log in to view your list" />
              }
            </Route>
            <Route path="/settings">
              {isAuthenticated ? <LazySettings /> :
                <AuthRequired message="Please log in to access settings" />
              }
            </Route>
            <Route path="/signin"><LazySignIn /></Route>
            <Route path="/signup"><LazySignUp /></Route>
            <Route path="/reset-password"><LazyResetPassword /></Route>
            <Route path="/confirm-reset-password"><LazyConfirmResetPassword /></Route>
            <Route path="/auth/callback"><LazyAuthCallback /></Route>
            <Route path="/auth/reset-password"><LazyConfirmResetPassword /></Route>
            <Route path="/verify-success"><LazyAuthCallback /></Route>
            <Route path="/verify-email"><LazyVerifyEmail /></Route>
            <Route path="/privacy"><LazyPrivacy /></Route>
            <Route path="/terms"><LazyTerms /></Route>
            <Route component={NotFound} />
          </Switch>
        </Suspense>
      </PageTransition>
      <Footer />
    </>
  );
}

// Minimal fallback shown only while a lazy chunk is downloading (first visit to that route)
function LoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-7 h-7 rounded-full border-2 border-red-600 border-t-transparent animate-spin" />
    </div>
  );
}

// Auth required message component
function AuthRequired({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 space-y-4">
      <p className="text-lg">{message}</p>
      <a 
        href="/api/login" 
        className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
          bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
      >
        Sign In
      </a>
    </div>
  );
}

const App: React.FC = () => {
  const { isOpen: noticeOpen, dismiss: dismissNotice } = useServiceNotice();

  return (
    <div className="app-wrapper overflow-x-hidden w-full max-w-[100vw]">
      <QueryClientProvider client={queryClient}>
        <ThemeProvider defaultTheme="dark">
          <TooltipProvider>
            <Toaster />
            <AuthProvider>
              <UserPreferencesProvider>
                <Router noticeOpen={noticeOpen} />
                <ServiceNotice isOpen={noticeOpen} onDismiss={dismissNotice} />
              </UserPreferencesProvider>
            </AuthProvider>
          </TooltipProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </div>
  );
}

export default App;
