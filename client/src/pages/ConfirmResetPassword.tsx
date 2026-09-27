import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import supabase from '../lib/supabase';

const ConfirmResetPassword: React.FC = () => {
  const [, setLocation] = useLocation();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [email, setEmail] = useState('');
  const [sessionReady, setSessionReady] = useState(false);

  // Supabase sends recovery links that redirect with hash params:
  // #access_token=...&type=recovery
  // The onAuthStateChange listener picks up the PASSWORD_RECOVERY event.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'PASSWORD_RECOVERY' && session) {
          setEmail(session.user.email || '');
          setSessionReady(true);
        }
      }
    );

    // Also check if we already have a recovery session (page refreshed)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setEmail(session.user.email || '');
        setSessionReady(true);
      } else {
        // No session and no recovery event — link may be invalid/expired
        // Give a small delay to allow the hash to be processed
        setTimeout(() => {
          setSessionReady((prev) => {
            if (!prev) setError('Invalid or expired reset link. Please request a new one.');
            return prev;
          });
        }, 3000);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!password) {
      setError('Please enter a new password');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });

      if (updateError) throw updateError;

      setSuccess(true);

      // Redirect to login page after a short delay
      setTimeout(() => {
        setLocation('/login');
      }, 3000);
    } catch (err: any) {
      console.error('Error resetting password:', err);
      if (err.message?.includes('weak')) {
        setError('Password is too weak. Please choose a stronger password.');
      } else {
        setError(err.message || 'Failed to reset password. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!sessionReady && !error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="bg-black bg-opacity-75 p-8 rounded-lg max-w-md w-full mx-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto mb-4"></div>
            <p className="text-white">Verifying reset link...</p>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="bg-black bg-opacity-75 p-8 rounded-lg max-w-md w-full mx-4">
          <div className="text-center">
            <div className="text-green-500 text-6xl mb-4">✓</div>
            <h2 className="text-section-title text-white font-bold mb-4">Password Reset Successful!</h2>
            <p className="text-gray-300 mb-4">
              Your password has been successfully reset. You will be redirected to the login page shortly.
            </p>
            <p className="text-gray-400 text-sm">
              Redirecting in 3 seconds...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="bg-black bg-opacity-75 p-8 rounded-lg max-w-md w-full mx-4">
        <h2 className="text-section-title text-white font-bold mb-6 text-center">
          Reset Your Password
        </h2>
        
        {email && (
          <p className="text-gray-300 mb-6 text-center">
            Setting new password for: <strong>{email}</strong>
          </p>
        )}

        {error && (
          <div className="bg-red-600 text-white p-3 rounded mb-4 text-center">
            {error}
          </div>
        )}

        {sessionReady ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-gray-300 text-sm font-medium mb-2">
                New Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3 bg-gray-700 text-white rounded focus:outline-none focus:ring-2 focus:ring-red-600"
                placeholder="Enter your new password"
                required
                minLength={6}
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-gray-300 text-sm font-medium mb-2">
                Confirm New Password
              </label>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full p-3 bg-gray-700 text-white rounded focus:outline-none focus:ring-2 focus:ring-red-600"
                placeholder="Confirm your new password"
                required
                minLength={6}
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-red-600 hover:bg-red-700 disabled:bg-red-800 text-white font-bold py-3 px-4 rounded transition duration-200"
            >
              {loading ? 'Resetting Password...' : 'Reset Password'}
            </button>
          </form>
        ) : (
          <div className="text-center">
            <p className="text-gray-300 mb-4">
              Unable to verify the password reset code.
            </p>
            <button
              onClick={() => setLocation('/reset-password')}
              className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded transition duration-200"
            >
              Request New Reset Link
            </button>
          </div>
        )}

        <div className="mt-6 text-center">
          <button
            onClick={() => setLocation('/login')}
            className="text-gray-400 hover:text-white transition duration-200"
          >
            Back to Login
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmResetPassword;
