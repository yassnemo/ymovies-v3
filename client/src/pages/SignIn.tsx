import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Eye, EyeOff, ArrowRight } from "lucide-react";
import { Link } from "wouter";
import SocialLoginButtons from "@/components/SocialLoginButtons";
import AuthBackground from "@/components/AuthBackground";

const SignIn = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { signIn } = useAuth();  const [, navigate] = useLocation();
  
  // Sign in using the auth hook
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast({
        title: "Error",
        description: "Please enter both email and password",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Use the signIn method from our auth hook
      const success = await signIn(email, password, rememberMe);
      
      if (success) {
        // Get redirect path or go to home page
        const redirectTo = redirectPath || "/";
        navigate(redirectTo);
        
        toast({
          title: "Success!",
          description: "Signed in successfully"
        });
      } else {
        setIsLoading(false);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to sign in. Please check your credentials.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // If there's a ?redirect=<path> query param, we'll redirect there after sign in
  const [location] = useLocation();
  const redirectPath = new URLSearchParams(location.split("?")[1]).get("redirect") || "/";
  return (
    <AuthBackground>
      <div className="flex flex-col justify-center min-h-screen w-full">
        <div className="container max-w-md mx-auto px-4 py-8">
          <div className="bg-black/70 backdrop-blur-md border border-gray-800/50 rounded-xl shadow-2xl p-8 animate-in slide-in-from-bottom-8 fade-in-50">
            <div className="mb-8 text-center">
              <h1 className="text-page-title font-bold text-white mb-2">YMovies</h1>
              <p className="text-gray-300">Sign in to continue your streaming journey</p>
            </div>

          <form onSubmit={handleSignIn}>
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-gray-300">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-gray-900/70 border-gray-700 text-gray-100 placeholder:text-gray-500 focus:ring-red-600 focus:border-red-600"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="password" className="text-sm font-medium text-gray-300">
                    Password
                  </Label>                  <Link 
                    href="/reset-password"
                    className="text-xs text-red-400 hover:text-red-300 hover:underline transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-gray-900/70 border-gray-700 text-gray-100 placeholder:text-gray-500 focus:ring-red-600 focus:border-red-600"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="remember-me" 
                    checked={rememberMe} 
                    onCheckedChange={(checked) => setRememberMe(checked === true)}
                    className="border-gray-600 data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600"
                  />
                  <Label htmlFor="remember-me" className="text-sm text-gray-400">
                    Remember me
                  </Label>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-red-600 hover:bg-red-700 text-white"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Signing In...
                  </div>
                ) : (
                  <span className="flex items-center justify-center">
                    Sign In <ArrowRight className="ml-2 h-4 w-4" />
                  </span>
                )}
              </Button>
            </div>
          </form>

          <div className="mt-8 text-center">
            <p className="text-gray-400">
              Don't have an account?{" "}
              <Link
                href="/signup"
                className="text-red-400 hover:text-red-300 hover:underline transition-colors"
              >
                Sign up
              </Link>
            </p>
              <div className="mt-6">
              <div className="relative">                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-gray-700"></span>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="px-2 bg-black text-gray-400">Or continue with</span>
                </div>
              </div>
                <p className="mt-4 text-xs text-gray-500 text-center leading-relaxed">
                YMovies is a personal project that allows users to browse movie metadata and manage their own watchlists. We use your Google account solely for authentication and to save your preferences. See our{" "}
                <Link href="/privacy" className="text-red-400 hover:underline">Privacy Policy</Link>.
              </p>
              <div className="mt-4">
                <SocialLoginButtons
                  showGoogle={true}
                  showFacebook={false}
                  showGithub={false}
                  onSuccess={() => navigate(redirectPath || "/")}
                />
              </div>
            </div>          </div>
        </div>
      </div>
    </div>
    </AuthBackground>
  );
};

export default SignIn;
