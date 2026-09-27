import React from "react";

const Terms = () => {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-4xl mx-auto px-6 py-20">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-page-title font-light tracking-wide mb-4">
            Terms of Service
          </h1>
          <p className="text-gray-400 text-sm">
            Last Updated: {new Date().toLocaleDateString('en-US', {year: 'numeric', month: 'long', day: 'numeric'})}
          </p>
        </div>

        {/* Content */}
        <div className="prose prose-lg max-w-none">
          <div className="space-y-12">
            <section>
              <h2 className="text-section-title font-light text-white mb-6 border-b border-gray-800 pb-2">
                1. Acceptance of Terms
              </h2>
              <p className="text-gray-300 leading-relaxed">
                By accessing or using YMovies, you agree to be bound by these Terms of Service. 
                If you do not agree to these terms, please do not use our service.
              </p>
            </section>

            <section>
              <h2 className="text-section-title font-light text-white mb-6 border-b border-gray-800 pb-2">
                2. Description of Service
              </h2>
              <p className="text-gray-300 leading-relaxed">
                YMovies provides personalized movie recommendations and related services. 
                We reserve the right to modify, suspend, or discontinue any aspect of our service at any time.
              </p>
            </section>

            <section>
              <h2 className="text-section-title font-light text-white mb-6 border-b border-gray-800 pb-2">
                3. User Accounts
              </h2>
              <p className="text-gray-300 leading-relaxed">
                You are responsible for maintaining the confidentiality of your account information, 
                including your password, and for all activity that occurs under your account.
              </p>
            </section>

            <section>
              <h2 className="text-section-title font-light text-white mb-6 border-b border-gray-800 pb-2">
                4. User Conduct
              </h2>
              <p className="text-gray-300 leading-relaxed mb-6">You agree not to use the service to:</p>
              <ul className="space-y-2 text-gray-300">
                <li className="flex items-start">
                  <span className="text-red-500 mr-3 mt-2">•</span>
                  Violate any applicable laws or regulations
                </li>
                <li className="flex items-start">
                  <span className="text-red-500 mr-3 mt-2">•</span>
                  Infringe the rights of others
                </li>
                <li className="flex items-start">
                  <span className="text-red-500 mr-3 mt-2">•</span>
                  Attempt to gain unauthorized access to any part of the service
                </li>
                <li className="flex items-start">
                  <span className="text-red-500 mr-3 mt-2">•</span>
                  Interfere with the proper working of the service
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-section-title font-light text-white mb-6 border-b border-gray-800 pb-2">
                5. Intellectual Property
              </h2>
              <p className="text-gray-300 leading-relaxed">
                All content included in the service, such as text, graphics, logos, and software, 
                is the property of YMovies or its content suppliers and is protected by copyright and other laws.
              </p>
            </section>

            <section>
              <h2 className="text-section-title font-light text-white mb-6 border-b border-gray-800 pb-2">
                6. Contact Us
              </h2>
              <p className="text-gray-300 leading-relaxed">
                If you have questions about these Terms of Service, please contact us at:{" "}
                <a 
                  href="mailto:terms@ymovies.example.com" 
                  className="text-red-500 hover:text-red-400 transition-colors underline"
                >
                  terms@ymovies.example.com
                </a>
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Terms;
