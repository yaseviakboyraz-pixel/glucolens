"use client";
import { useState, useEffect } from "react";
import { UploadAnalyzer } from "@/components/upload-analyzer";
import { HistoryDashboard } from "@/components/history-dashboard";
import { UserProfileSetup } from "@/components/user-profile-setup";
import { LangSwitcher } from "@/components/lang-switcher";
import { SingleIngredientAnalyzer } from "@/components/single-ingredient";
import { QRMenuAnalyzer } from "@/components/qr-menu-analyzer";
import { DrinkAnalyzer } from "@/components/drink-analyzer";
import { MealPlanGenerator } from "@/components/meal-plan";
import { AuthScreen } from "@/components/auth-screen";
import { getProfile, saveProfile, type UserProfile } from "@/lib/storage";
import { detectBrowserLang, type Lang } from "@/lib/i18n";
import { onAuthStateChange, signOut, type User } from "@/lib/auth";

type View = "setup" | "analyze" | "history" | "ingredient" | "menu" | "drink" | "plan";

export default function Home() {
  const [lang, setLang] = useState<Lang>("en");
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [view, setView] = useState<View>("analyze");
  const [loaded, setLoaded] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [showAuth, setShowAuth] = useState(false);

  useEffect(() => {
    setLang(detectBrowserLang());
    const p = getProfile();
    setProfile(p);
    if (!p || !p.setupComplete) setView("setup");
    setLoaded(true);

    // Auth state listener
    const subscription = onAuthStateChange((u) => {
      setUser(u);
      if (u) {
        // Sync user name to profile if available
        const currentProfile = getProfile();
        if (currentProfile && u.user_metadata?.name && !currentProfile.name) {
          const updated = { ...currentProfile, name: u.user_metadata.name };
          saveProfile(updated);
          setProfile(updated);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  function refreshProfile() {
    const p = getProfile();
    setProfile(p);
  }

  if (!loaded) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-teal-500 text-2xl animate-pulse">●</div>
      </div>
    );
  }

  // Auth screen
  if (showAuth) {
    return (
      <AuthScreen onSuccess={() => {
        setShowAuth(false);
        refreshProfile();
      }} />
    );
  }

  if (view === "setup") {
    return (
      <UserProfileSetup
        lang={lang}
        onComplete={() => { refreshProfile(); setView("analyze"); }}
      />
    );
  }

  const TABS = [
    { key: "analyze",    icon: "📷", label: "Meal" },
    { key: "drink",      icon: "🥤", label: "Drink" },
    { key: "ingredient", icon: "🔬", label: "Search" },
    { key: "menu",       icon: "🍽️", label: "Menu" },
    { key: "plan",       icon: "🗓️", label: "Plan" },
    { key: "history",    icon: "📊", label: "History" },
  ] as { key: View; icon: string; label: string }[];

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
            {/* Auth button */}
            {user ? (
              <button onClick={() => signOut().catch(console.error)}
                className="text-xs text-gray-500 hover:text-gray-300 transition-colors px-2 py-1 rounded-lg border border-gray-800">
                Sign out
              </button>
            ) : (
              <button onClick={() => setShowAuth(true)}
                className="text-xs text-teal-400 hover:text-teal-300 transition-colors px-2 py-1 rounded-lg border border-teal-800 bg-teal-950/30">
                Sign in
              </button>
            )}
            <LangSwitcher current={lang} onChange={setLang} />
          </div>
        </div>

        {/* Cloud sync indicator */}
        {user && (
          <div className="max-w-2xl mx-auto px-4 pb-1">
            <p className="text-xs text-green-500">☁️ Synced · {user.email}</p>
          </div>
        )}

        {/* Nav tabs */}
        <div className="max-w-2xl mx-auto px-4 pb-2 grid grid-cols-6 gap-1">
          {TABS.map(tab => (
            <button key={tab.key} onClick={() => setView(tab.key)}
              className={`py-1.5 rounded-lg text-xs font-medium transition-all ${
                view === tab.key
                  ? "bg-teal-600 text-white"
                  : "bg-gray-800/50 text-gray-500 hover:text-gray-300"
              }`}>
              <div className="text-sm">{tab.icon}</div>
              <div className="text-[10px]">{tab.label}</div>
            </button>
          ))}
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
        {view === "drink" && (
          <DrinkAnalyzer lang={lang} userType={profile?.userType || "healthy"} />
        )}
        {view === "ingredient" && (
          <SingleIngredientAnalyzer lang={lang} onSaved={refreshProfile} />
        )}
        {view === "menu" && (
          <QRMenuAnalyzer lang={lang} userType={profile?.userType || "healthy"} />
        )}
        {view === "plan" && (
          <MealPlanGenerator lang={lang} userType={profile?.userType || "healthy"} />
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
