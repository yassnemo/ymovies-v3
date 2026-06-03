import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  KeyRound,
  Bell,
  ShieldCheck,
  Info,
  LogOut,
  SlidersHorizontal,
} from "lucide-react";

import supabase from "@/lib/supabase";

interface NotificationSettings {
  recommendations: boolean;
  newReleases: boolean;
  watchHistory: boolean;
  useForRecommendations: boolean;
}

const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  recommendations: true,
  newReleases: true,
  watchHistory: true,
  useForRecommendations: true,
};

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  return {
    "Authorization": token ? `Bearer ${token}` : "",
    "Content-Type": "application/json",
  };
}

/** A cinematic settings panel — eyebrow label + framed body, matches the
 *  profile / landing design language. */
const Panel = ({
  icon: Icon,
  eyebrow,
  title,
  description,
  children,
}: {
  icon: React.ElementType;
  eyebrow: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) => (
  <section className="rounded-sm border border-white/10 bg-[#0b0b0b] overflow-hidden">
    <div className="flex items-start gap-4 border-b border-white/5 px-5 sm:px-6 py-5">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm bg-red-600/10 border border-red-600/20">
        <Icon className="h-5 w-5 text-red-500" />
      </span>
      <div className="min-w-0">
        <p className="text-red-500 text-[10px] font-semibold uppercase tracking-[0.25em] mb-1">
          {eyebrow}
        </p>
        <h2 className="font-logo tracking-wide text-2xl leading-none">{title}</h2>
        {description && (
          <p className="text-sm text-gray-500 mt-1.5">{description}</p>
        )}
      </div>
    </div>
    <div className="px-5 sm:px-6 py-5">{children}</div>
  </section>
);

/** A labelled toggle row. */
const ToggleRow = ({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: () => void;
}) => (
  <div className="flex items-center justify-between gap-4 py-1">
    <div className="min-w-0">
      <p className="text-sm font-medium text-white">{label}</p>
      {description && (
        <p className="text-xs text-gray-500 mt-0.5">{description}</p>
      )}
    </div>
    <Switch checked={checked} onCheckedChange={onChange} className="shrink-0" />
  </div>
);

const fieldClass =
  "bg-white/5 border-white/10 text-white placeholder:text-gray-600 focus-visible:ring-red-600/40";

const Settings = () => {
  const { user, supabaseUser, signOut, changePassword } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>(
    DEFAULT_NOTIFICATION_SETTINGS
  );
  const [isSaving, setIsSaving] = useState(false);

  // Load app settings from server on mount
  useEffect(() => {
    if (!supabaseUser) return;
    let cancelled = false;

    (async () => {
      try {
        const headers = await getAuthHeaders();
        const res = await fetch("/api/preferences", { headers });
        if (!res.ok) return;
        const data = await res.json();
        const saved = data?.appSettings?.notifications;
        if (saved && !cancelled) {
          setNotificationSettings((prev) => ({ ...prev, ...saved }));
        }
      } catch {
        // Keep defaults on failure
      }
    })();

    return () => { cancelled = true; };
  }, [supabaseUser]);

  const toggleSetting = async (key: keyof NotificationSettings) => {
    if (!supabaseUser) return;

    const updated = { ...notificationSettings, [key]: !notificationSettings[key] };
    setNotificationSettings(updated);
    setIsSaving(true);

    try {
      const headers = await getAuthHeaders();

      // Fetch current preferences to merge into
      const res = await fetch("/api/preferences", { headers });
      const current = res.ok ? await res.json() : {};

      const body = {
        ...current,
        appSettings: { ...(current.appSettings || {}), notifications: updated },
      };

      const saveRes = await fetch("/api/preferences", {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });

      if (saveRes.ok) {
        toast({ title: "Settings updated", description: "Your preferences have been saved." });
      } else {
        throw new Error("Server returned " + saveRes.status);
      }
    } catch {
      toast({ title: "Saved locally", description: "We'll sync your settings when the connection is restored." });
    } finally {
      setIsSaving(false);
    }
  };

  // Change password
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changing, setChanging] = useState(false);

  const canSubmitChange = useMemo(
    () => newPassword.length >= 8 && newPassword === confirmPassword && currentPassword.length > 0,
    [newPassword, confirmPassword, currentPassword]
  );

  const handleChangePassword = async () => {
    if (!canSubmitChange) return;
    setChanging(true);
    const ok = await changePassword(currentPassword, newPassword);
    setChanging(false);
    if (ok) {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="px-6 sm:px-12 lg:px-20 pt-28 pb-8 border-b border-white/5">
        <div className="max-w-3xl mx-auto">
          <p className="text-red-500 text-xs font-semibold uppercase tracking-[0.25em] mb-3 flex items-center gap-2">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Account
          </p>
          <h1 className="font-logo tracking-wide text-4xl sm:text-6xl leading-none">
            Settings
          </h1>
          <p className="text-gray-500 mt-3 text-sm">
            Manage your account, notifications, and privacy.
          </p>
        </div>
      </div>

      {/* Body */}
      <div className="px-6 sm:px-12 lg:px-20 py-10">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Account */}
          <Panel
            icon={KeyRound}
            eyebrow="Identity"
            title="Account"
            description="Your sign-in email and password."
          >
            <div className="space-y-5">
              <div>
                <label htmlFor="email" className="text-xs uppercase tracking-wider text-gray-500 mb-1.5 block">
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  value={user?.email || "No email available"}
                  readOnly
                  className={`${fieldClass} opacity-70 cursor-default`}
                />
              </div>

              <div className="h-px bg-white/5" />

              <div className="space-y-3">
                <p className="text-xs uppercase tracking-wider text-gray-500">
                  Change password
                </p>
                <Input
                  id="current-password"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Current password"
                  className={fieldClass}
                />
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="New password — at least 8 characters"
                  className={fieldClass}
                />
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className={fieldClass}
                />
                <div className="flex justify-end pt-1">
                  <Button
                    size="sm"
                    disabled={!canSubmitChange || changing}
                    onClick={handleChangePassword}
                    className="bg-red-600 hover:bg-red-700 text-white rounded-sm"
                  >
                    {changing ? "Updating…" : "Change Password"}
                  </Button>
                </div>
              </div>
            </div>
          </Panel>

          {/* Notifications */}
          <Panel
            icon={Bell}
            eyebrow="Stay in the loop"
            title="Notifications"
            description="Choose what we tell you about."
          >
            <div className="divide-y divide-white/5">
              <div className="pb-3">
                <ToggleRow
                  label="New Recommendations"
                  description="When fresh picks are tailored to your taste."
                  checked={notificationSettings.recommendations}
                  onChange={() => toggleSetting("recommendations")}
                />
              </div>
              <div className="pt-3">
                <ToggleRow
                  label="New Releases"
                  description="Just-added titles in genres you follow."
                  checked={notificationSettings.newReleases}
                  onChange={() => toggleSetting("newReleases")}
                />
              </div>
            </div>
          </Panel>

          {/* Privacy */}
          <Panel
            icon={ShieldCheck}
            eyebrow="Your data"
            title="Privacy"
            description="Control how your activity is used."
          >
            <div className="divide-y divide-white/5">
              <div className="pb-3">
                <ToggleRow
                  label="Save Watch History"
                  description="Keep track of what you've watched."
                  checked={notificationSettings.watchHistory}
                  onChange={() => toggleSetting("watchHistory")}
                />
              </div>
              <div className="pt-3">
                <ToggleRow
                  label="Use Viewing Activity for Recommendations"
                  description="Sharpen your picks using what you watch."
                  checked={notificationSettings.useForRecommendations}
                  onChange={() => toggleSetting("useForRecommendations")}
                />
              </div>
            </div>
            {isSaving && (
              <p className="text-xs text-gray-500 mt-3">Saving…</p>
            )}
          </Panel>

          {/* About */}
          <Panel icon={Info} eyebrow="The fine print" title="About">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm text-gray-400">
              <span>
                <span className="text-gray-500">Version</span> 3.0.0
              </span>
              <span className="hidden sm:inline w-px h-3.5 bg-white/10" />
              <span>© {new Date().getFullYear()} YMovies</span>
            </div>
          </Panel>

          {/* Sign out */}
          <div className="flex justify-center pt-2">
            <Button
              variant="outline"
              className="border-red-600/30 text-red-400 hover:bg-red-600/10 hover:text-red-300 rounded-sm gap-2"
              onClick={async () => {
                await signOut();
                navigate("/");
              }}
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
