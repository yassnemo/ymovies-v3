/**
 * AuthProvider — Supabase edition
 * Drop-in replacement for the Firebase-based AuthProvider.
 *
 * What changed:
 *  - All Firebase Auth SDK imports → @supabase/supabase-js via `supabase` client
 *  - signUp: supabase.auth.signUp() — sends confirmation email automatically via SMTP
 *  - signIn: supabase.auth.signInWithPassword()
 *  - signInWithGoogle: supabase.auth.signInWithOAuth({ provider: 'google' })
 *  - signOut: supabase.auth.signOut()
 *  - resetPassword: supabase.auth.resetPasswordForEmail() — no server endpoint needed
 *  - verifyEmail: supabase.auth.resend({ type: 'signup' }) — resend confirmation
 *  - changePassword: supabase.auth.updateUser({ password }) — session-based, no reauth
 *  - onAuthStateChanged → supabase.auth.onAuthStateChange()
 *
 * Email verification & password reset emails are sent automatically by Supabase
 * through the Resend SMTP integration — no custom server endpoints required.
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { User, SignUpData, AuthState } from '@/types/auth';
import supabase from '@/lib/supabase';
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';

interface AuthContextType extends AuthState {
  signIn: (email: string, password: string, rememberMe?: boolean) => Promise<boolean>;
  signUp: (userData: SignUpData) => Promise<boolean>;
  signInWithGoogle: () => Promise<boolean>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<boolean>;
  verifyEmail: () => Promise<boolean>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<boolean>;
  supabaseUser: SupabaseUser | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Convert Supabase user to our User type
const mapSupabaseUser = (sbUser: SupabaseUser): User => {
  const meta = sbUser.user_metadata || {};
  return {
    id: sbUser.id,
    email: sbUser.email || '',
    firstName: meta.first_name || meta.full_name?.split(' ')[0] || '',
    lastName: meta.last_name || meta.full_name?.split(' ').slice(1).join(' ') || '',
    profileImageUrl: meta.avatar_url || meta.picture || '',
    createdAt: sbUser.created_at || '',
  };
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [initializing, setInitializing] = useState(true);

  // ─── Auth state listener ──────────────────────────────
  useEffect(() => {
    // 1. Check current session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSupabaseUser(session?.user ?? null);
      setInitializing(false);
    });

    // 2. Listen for future auth changes (sign in, sign out, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSupabaseUser(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Derived state
  const user: User | null = supabaseUser ? mapSupabaseUser(supabaseUser) : null;
  const isLoading = initializing;
  const isAuthenticated = !!user;
  const isGuest = !isLoading && !isAuthenticated;
  const isError = false;

  // ─── Sign in with email/password ──────────────────────
  const signIn = async (email: string, password: string, _rememberMe = false): Promise<boolean> => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) throw error;

      toast({
        title: 'Signed in successfully',
        description: 'Welcome back!',
      });
      return true;
    } catch (error: any) {
      console.error('Sign in error:', error);
      toast({
        title: 'Error signing in',
        description: error.message || 'Please check your credentials and try again',
        variant: 'destructive',
      });
      return false;
    }
  };

  // ─── Sign up with email/password ──────────────────────
  const signUp = async (userData: SignUpData): Promise<boolean> => {
    try {
      const { email, password, firstName, lastName } = userData;

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            full_name: `${firstName}${lastName ? ' ' + lastName : ''}`,
          },
          // Where the user lands after clicking the email link
          emailRedirectTo: `${window.location.origin}/verify-success`,
        },
      });

      if (error) throw error;

      // Supabase automatically sends the confirmation email via Resend SMTP.
      // No need to call a server endpoint!

      toast({
        title: 'Account created successfully',
        description: 'Please check your email to verify your account.',
      });
      return true;
    } catch (error: any) {
      console.error('Sign up error:', error);
      toast({
        title: 'Error creating account',
        description: error.message || 'Please try again later',
        variant: 'destructive',
      });
      return false;
    }
  };

  // ─── Sign in with Google OAuth ────────────────────────
  const signInWithGoogle = async (): Promise<boolean> => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) throw error;

      // OAuth redirects to Google — the toast won't show until redirect back
      return true;
    } catch (error: any) {
      console.error('Google sign-in error:', error);
      toast({
        title: 'Error signing in with Google',
        description: error.message || 'Please try again later',
        variant: 'destructive',
      });
      return false;
    }
  };

  // ─── Sign out ─────────────────────────────────────────
  const signOut = async (): Promise<void> => {
    try {
      await supabase.auth.signOut();
      queryClient.clear();
      toast({ title: 'Signed out successfully' });
    } catch (error: any) {
      console.error('Sign out error:', error);
      toast({
        title: 'Error signing out',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    }
  };

  // ─── Password reset ──────────────────────────────────
  // Supabase sends the email automatically via SMTP (Resend).
  // No server endpoint needed — this is a client-only call.
  const resetPassword = async (email: string): Promise<boolean> => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (error) throw error;

      toast({
        title: 'Password reset email sent',
        description: 'Please check your inbox for instructions',
      });
      return true;
    } catch (error: any) {
      console.error('Password reset error:', error);
      toast({
        title: 'Error resetting password',
        description: error.message || 'Please try again later',
        variant: 'destructive',
      });
      return false;
    }
  };

  // ─── Resend email verification ────────────────────────
  const verifyEmail = async (): Promise<boolean> => {
    try {
      if (!supabaseUser?.email) return false;

      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: supabaseUser.email,
        options: {
          emailRedirectTo: `${window.location.origin}/verify-success`,
        },
      });

      if (error) throw error;

      toast({
        title: 'Verification email sent',
        description: 'Please check your inbox',
      });
      return true;
    } catch (error: any) {
      console.error('Email verification error:', error);
      toast({
        title: 'Error sending verification email',
        description: error.message || 'Please try again later',
        variant: 'destructive',
      });
      return false;
    }
  };

  // ─── Change password ─────────────────────────────────
  // Supabase uses session-based auth — no reauthentication needed.
  // The user must have a valid session to call this.
  const changePassword = async (_currentPassword: string, newPassword: string): Promise<boolean> => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      toast({ title: 'Password updated' });
      return true;
    } catch (error: any) {
      console.error('Change password error:', error);
      toast({
        title: 'Error changing password',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
      return false;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        supabaseUser,
        isLoading,
        isAuthenticated,
        isError,
        isGuest,
        signIn,
        signUp,
        signInWithGoogle,
        signOut,
        resetPassword,
        verifyEmail,
        changePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
