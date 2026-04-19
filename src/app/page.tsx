"use client";
import { useState, useEffect } from "react";
import { UploadAnalyzer } from "@/components/upload-analyzer";
import { HistoryDashboard } from "@/components/history-dashboard";
import { UserProfileSetup } from "@/components/user-profile-setup";
import { LangSwitcher } from "@/components/lang-switcher";
import { getProfile, type UserProfile } from "@/lib/storage";
import { detectBrowserLang, type Lang } from "@/lib/i18n";

type View = "setup" | "analyze" | "history";

export default function Home() {
  const [lang, setLang] = useState<Lang>("en");
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [view, setView] = useState<View>("analyze");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLang(detectBrowserLang());
    const p = getProfile();
    setProfile(p);
    if (!p || !p.setupComplete) {
      setView("setup");
    }
    setLoaded(true);
  }, []);

  function handleSetupComplete() {
    const p = getProfile();
    setProfile(p);
    setView("analyze");
  }

  if (!loaded) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-teal-500 text-2xl animate-pulse">●</div>
      </div>
    );
  }

  if (view === "setup") {
    return <UserProfileSetup lang={lang} onComplete={handleSetupComplete} />;
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="bg-gradient-to-b from-gray-900 to-gray-950 border-b border-gray-800 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-teal-400 to-emerald-400 bg-clip-text text-transparent">
              GlucoLens
            </h1>
            {profile?.name && (
              <p className="text-xs text-gray-500">Hi, {profile.name} 👋</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <LangSwitcher current={lang} onChange={setLang} />
            <button
              onClick={() => setView(view === "history" ? "analyze" : "history")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                view === "history"
                  ? "bg-teal-600 text-white"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-700"
              }`}
            >
              {view === "history" ? "📷 Analyze" : "📊 History"}
            </button>
          </div>
        </div>

        {/* Tab indicator */}
        {view === "analyze" && (
          <div className="max-w-2xl mx-auto px-6 pb-3">
            <p className="text-xs text-gray-500">
              Upload a meal photo — instantly see sugar &amp; glycemic load
            </p>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-6 py-6">
        {view === "analyze" ? (
          <UploadAnalyzer
            userType={profile?.userType || "healthy"}
            lang={lang}
            onAnalysisComplete={() => {
              // After analysis, optionally switch to history
            }}
          />
        ) : (
          profile && (
            <HistoryDashboard
              profile={profile}
              lang={lang}
              onNewMeal={() => setView("analyze")}
            />
          )
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-gray-800 mt-8 py-4 text-center">
        <p className="text-gray-700 text-xs">
          GlucoLens © 2026 · Powered by Claude AI · Not medical advice
        </p>
      </div>
    </main>
  );
}
