"use client";
import { useState, useEffect } from "react";
import { UploadAnalyzer } from "@/components/upload-analyzer";
import { HistoryDashboard } from "@/components/history-dashboard";
import { UserProfileSetup } from "@/components/user-profile-setup";
import { LangSwitcher } from "@/components/lang-switcher";
import { SingleIngredientAnalyzer } from "@/components/single-ingredient";
import { getProfile, type UserProfile } from "@/lib/storage";
import { detectBrowserLang, type Lang } from "@/lib/i18n";

type View = "setup" | "analyze" | "history" | "ingredient";

export default function Home() {
  const [lang, setLang] = useState<Lang>("en");
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [view, setView] = useState<View>("analyze");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLang(detectBrowserLang());
    const p = getProfile();
    setProfile(p);
    if (!p || !p.setupComplete) setView("setup");
    setLoaded(true);
  }, []);

  function refreshProfile() {
    const p = getProfile();
    setProfile(p);
  }

  function handleSetupComplete() {
    refreshProfile();
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
      {/* Sticky Header */}
      <div className="bg-gray-900/90 backdrop-blur border-b border-gray-800 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold bg-gradient-to-r from-teal-400 to-emerald-400 bg-clip-text text-transparent">
              GlucoLens
            </span>
            {profile?.name && (
              <span className="text-xs text-gray-600 hidden sm:block">· {profile.name}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <LangSwitcher current={lang} onChange={setLang} />
          </div>
        </div>

        {/* Nav tabs */}
        <div className="max-w-2xl mx-auto px-4 pb-2 grid grid-cols-4 gap-1.5">
          {([
            { key: "analyze",    icon: "📷", label: "Analyze" },
            { key: "ingredient", icon: "🔬", label: "Ingredient" },
            { key: "history",    icon: "📊", label: "History" },
          ] as { key: View; icon: string; label: string }[]).map((tab) => (
            <button key={tab.key} onClick={() => setView(tab.key)}
              className={`py-1.5 rounded-lg text-xs font-medium transition-all ${
                view === tab.key ? "bg-teal-600 text-white" : "bg-gray-800/50 text-gray-500 hover:text-gray-300"
              }`}>
              {tab.icon} {tab.label}
            </button>
          ))}
          <button onClick={() => setView(view === "history" ? "analyze" : "history")}
            className="py-1.5 rounded-lg text-xs font-medium bg-gray-800/50 text-gray-500 hover:text-gray-300 transition-all">
            {profile?.userType === "diabetic" ? "🩺" : profile?.userType === "pre_diabetic" ? "⚠️" : "✅"} Profile
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        {view === "analyze" && (
          <UploadAnalyzer
            userType={profile?.userType || "healthy"}
            lang={lang}
            onAnalysisComplete={refreshProfile}
          />
        )}
        {view === "ingredient" && (
          <SingleIngredientAnalyzer lang={lang} onSaved={refreshProfile} />
        )}
        {view === "history" && profile && (
          <HistoryDashboard
            profile={profile}
            lang={lang}
            onNewMeal={() => setView("analyze")}
            onEditProfile={() => setView("setup")}
          />
        )}
      </div>

      <div className="border-t border-gray-800 py-4 text-center mt-8">
        <p className="text-gray-700 text-xs">
          GlucoLens © 2026 · Powered by Claude AI · Not medical advice
        </p>
      </div>
    </main>
  );
}
