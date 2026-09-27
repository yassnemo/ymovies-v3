import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/useAuth';

/**
 * Handles Supabase OAuth callback redirects.
 * Supabase appends #access_token=... to the URL after Google sign-in.
 * The AuthProvider's onAuthStateChange listener automatically picks up
 * the session from the hash fragment — this page just shows a loading
 * spinner and redirects to /home once authenticated.
 */
const AuthCallback = () => {
  const [, setLocation] = useLocation();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      setLocation('/home');
    }
    // If not authenticated after loading, redirect to sign in
    if (!isLoading && !isAuthenticated) {
      // Give Supabase a moment to process the hash fragment
      const timer = setTimeout(() => {
        setLocation('/signin');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, isLoading, setLocation]);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-600 mx-auto mb-4"></div>
        <p className="text-white text-body">Signing you in...</p>
      </div>
    </div>
  );
};

export default AuthCallback;
