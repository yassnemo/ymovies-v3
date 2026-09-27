import React from "react";
import { Link } from "wouter";

const Privacy = () => {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-3xl mx-auto px-6 py-20">
        {/* Header */}
        <div className="mb-12">
          <Link href="/home" className="text-red-500 hover:text-red-400 text-sm mb-6 inline-block">&larr; Back to YMovies</Link>
          <h1 className="text-page-title font-light tracking-wide mb-4">
            Privacy Policy
          </h1>
          <p className="text-gray-400 text-sm">
            Effective Date: February 13, 2026
          </p>
        </div>

        {/* Content */}
        <div className="space-y-10">
          <section>
            <h2 className="text-section-title font-semibold text-white mb-4 border-b border-gray-800 pb-2">
              1. Introduction
            </h2>
            <p className="text-gray-300 leading-relaxed">
              YMovies ("we", "our", "us") is a personal, non-commercial project that allows users to browse movie and TV show metadata sourced from the TMDB API and manage their own watchlists. This Privacy Policy explains what information we collect, how we use it, and your choices regarding your data.
            </p>
          </section>

          <section>
            <h2 className="text-section-title font-semibold text-white mb-4 border-b border-gray-800 pb-2">
              2. Information We Collect
            </h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              When you sign in with your Google account, we receive and store only the following information provided by Google:
            </p>
            <ul className="space-y-2 text-gray-300">
              <li className="flex items-start">
                <span className="text-red-500 mr-3 mt-0.5">-</span>
                Your name (display name)
              </li>
              <li className="flex items-start">
                <span className="text-red-500 mr-3 mt-0.5">-</span>
                Your email address
              </li>
              <li className="flex items-start">
                <span className="text-red-500 mr-3 mt-0.5">-</span>
                Your profile picture URL
              </li>
            </ul>
            <p className="text-gray-300 leading-relaxed mt-4">
              We do not request access to your Google contacts, Google Drive, Gmail, or any other Google services beyond basic profile information.
            </p>
          </section>

          <section>
            <h2 className="text-section-title font-semibold text-white mb-4 border-b border-gray-800 pb-2">
              3. How We Use Your Information
            </h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              Your data is used solely for the following purposes:
            </p>
            <ul className="space-y-2 text-gray-300">
              <li className="flex items-start">
                <span className="text-red-500 mr-3 mt-0.5">-</span>
                <strong>Authentication:</strong> To identify you and allow you to sign in securely.
              </li>
              <li className="flex items-start">
                <span className="text-red-500 mr-3 mt-0.5">-</span>
                <strong>Preferences:</strong> To store your movie watchlist, favorites, and viewing preferences so they persist across sessions.
              </li>
              <li className="flex items-start">
                <span className="text-red-500 mr-3 mt-0.5">-</span>
                <strong>Display:</strong> To show your name and profile picture within the app interface.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-section-title font-semibold text-white mb-4 border-b border-gray-800 pb-2">
              4. Data Sharing
            </h2>
            <p className="text-gray-300 leading-relaxed">
              We do <strong>not</strong> sell, trade, rent, or share your personal information with any third parties. Your data is stored securely and is only accessible to you through your authenticated account.
            </p>
          </section>

          <section>
            <h2 className="text-section-title font-semibold text-white mb-4 border-b border-gray-800 pb-2">
              5. Data Storage & Security
            </h2>
            <p className="text-gray-300 leading-relaxed">
              Your account data is stored in a secure PostgreSQL database hosted on Neon. Authentication is handled by Supabase Auth (email/password and Google OAuth). We do not store your Google password. We implement reasonable security measures to protect your information, but no method of electronic storage is 100% secure.
            </p>
          </section>

          <section>
            <h2 className="text-section-title font-semibold text-white mb-4 border-b border-gray-800 pb-2">
              6. Your Rights
            </h2>
            <p className="text-gray-300 leading-relaxed mb-4">You can at any time:</p>
            <ul className="space-y-2 text-gray-300">
              <li className="flex items-start">
                <span className="text-red-500 mr-3 mt-0.5">-</span>
                View and update your profile information in your account settings
              </li>
              <li className="flex items-start">
                <span className="text-red-500 mr-3 mt-0.5">-</span>
                Delete your watchlist, favorites, and watch history
              </li>
              <li className="flex items-start">
                <span className="text-red-500 mr-3 mt-0.5">-</span>
                Request complete deletion of your account and all associated data by contacting us
              </li>
              <li className="flex items-start">
                <span className="text-red-500 mr-3 mt-0.5">-</span>
                Revoke YMovies access from your Google account at{" "}
                <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer" className="text-red-500 hover:text-red-400 underline">myaccount.google.com/permissions</a>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-section-title font-semibold text-white mb-4 border-b border-gray-800 pb-2">
              7. Changes to This Policy
            </h2>
            <p className="text-gray-300 leading-relaxed">
              We may update this Privacy Policy from time to time. Any changes will be posted on this page with an updated effective date. Continued use of YMovies after changes constitutes acceptance of the revised policy.
            </p>
          </section>

          <section>
            <h2 className="text-section-title font-semibold text-white mb-4 border-b border-gray-800 pb-2">
              8. Contact
            </h2>
            <p className="text-gray-300 leading-relaxed">
              If you have any questions or concerns about this Privacy Policy or your data, please contact us at:{" "}
              <a 
                href="mailto:mailbot@yerradouani.me" 
                className="text-red-500 hover:text-red-400 transition-colors underline"
              >
                mailbot@yerradouani.me
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Privacy;
