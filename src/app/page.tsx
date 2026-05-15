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
import { Paywall } from "@/components/paywall";
import { getProfile, saveProfile, syncFromCloud, type UserProfile } from "@/lib/storage";
import { detectBrowserLang, type Lang } from "@/lib/i18n";
import { onAuthStateChange, signOut, type User } from "@/lib/auth";
import { initPushNotifications } from "@/lib/push-notifications";
import { initNetworkMonitor, onNetworkChange, isOnline, type NetworkStatus } from "@/lib/network";
import { getCurrentPlan, type PlanId } from "@/lib/subscriptions";

type View = "setup" | "analyze" | "history" | "ingredient" | "menu" | "drink" | "plan";

export default function Home() {
  const [lang, setLang] = useState<Lang>("en");
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [view, setView] = useState<View>("analyze");
  const [loaded, setLoaded] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<PlanId>("free");
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>("unknown");
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const saved = localStorage.getItem("glucolens_lang") as Lang | null;
    setLang(saved || detectBrowserLang());
    const p = getProfile();
    setProfile(p);
    if (!p || !p.setupComplete) setView("setup");
    setLoaded(true);

    const savedTheme = localStorage.getItem("glucolens_theme") as "dark" | "light" | null;
    const t = savedTheme || "dark";
    setTheme(t);
    document.documentElement.classList.toggle("light", t === "light");

    initPushNotifications().catch(console.error);
    initNetworkMonitor().then(() => setNetworkStatus(isOnline() ? "online" : "offline"));
    const unsubNetwork = onNetworkChange(status => setNetworkStatus(status));
    getCurrentPlan().then(setCurrentPlan);

    const subscription = onAuthStateChange((u) => {
      setUser(u);
      if (u) {
        syncFromCloud().then(({ profile: cloudProfile }) => {
          if (cloudProfile) {
            setProfile(cloudProfile);
            if (cloudProfile.setupComplete) setView("analyze");
          }
        }).catch(console.error);
        const currentProfile = getProfile();
        if (currentProfile && u.user_metadata?.name && !currentProfile.name) {
          const updated = { ...currentProfile, name: u.user_metadata.name };
          saveProfile(updated);
          setProfile(updated);
        }
      }
    });

    return () => { subscription.unsubscribe(); unsubNetwork(); };
  }, []);

  function handleLangChange(l: Lang) {
    setLang(l);
    localStorage.setItem("glucolens_lang", l);
    document.documentElement.lang = l;
    document.documentElement.dir = l === "ar" ? "rtl" : "ltr";
  }

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("glucolens_theme", next);
    document.documentElement.classList.toggle("light", next === "light");
  }

  function refreshProfile() {
    setProfile(getProfile());
  }

  // Loading
  if (!loaded) {
    return (
      <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--nova-bg)" }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: "rgba(139,92,246,0.8)", animation: "nova-pulse 1.2s infinite" }} />
      </div>
    );
  }

  if (showAuth) {
    return <AuthScreen onSuccess={() => { setShowAuth(false); refreshProfile(); }} />;
  }

  if (view === "setup") {
    return (
      <UserProfileSetup lang={lang} onComplete={() => { refreshProfile(); setView("analyze"); }} />
    );
  }

  return (
    <div className="nova-page">

      {/* ── HEADER ── */}
      <header className="nova-header">
        <div>
          <div className="nova-logo-word">GlucoLens</div>
          <div className="nova-logo-sub">Glucose Intelligence</div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>

          {/* Network offline badge */}
          {networkStatus === "offline" && (
            <span style={{ fontSize: 9, color: "rgba(245,158,11,0.8)", letterSpacing: 1, background: "rgba(245,158,11,0.08)", border: "0.5px solid rgba(245,158,11,0.2)", borderRadius: 20, padding: "2px 8px" }}>
              OFFLINE
            </span>
          )}

          {/* Plan badge */}
          {currentPlan === "pro" && (
            <span style={{ fontSize: 9, color: "rgba(139,92,246,0.9)", letterSpacing: 1, background: "rgba(139,92,246,0.1)", border: "0.5px solid rgba(139,92,246,0.25)", borderRadius: 20, padding: "2px 10px", fontWeight: 600 }}>
              PRO
            </span>
          )}

          {/* Auth */}
          {user ? (
            <button onClick={() => signOut().catch(console.error)} className="nova-hbtn" title="Sign out">
              <i className="ti ti-logout" />
            </button>
          ) : (
            <button onClick={() => setShowAuth(true)} className="nova-hbtn" title="Sign in">
              <i className="ti ti-user" />
            </button>
          )}

          {/* Theme toggle */}
          <button onClick={toggleTheme} className="nova-hbtn" title="Toggle theme">
            <i className={`ti ti-${theme === "dark" ? "sun" : "moon"}`} />
          </button>

          {/* Language */}
          <LangSwitcher current={lang} onChange={handleLangChange} />
        </div>
      </header>

      {/* ── CLOUD SYNC INDICATOR ── */}
      {user && (
        <div style={{ padding: "4px 18px", display: "flex", alignItems: "center", gap: 6, borderBottom: "0.5px solid var(--nova-border)" }}>
          <i className="ti ti-cloud-check" style={{ fontSize: 12, color: "rgba(16,185,129,0.6)" }} />
          <span style={{ fontSize: 9, color: "var(--nova-text-4)", letterSpacing: 1 }}>{user.email}</span>
        </div>
      )}

      {/* ── CONTENT ── */}
      <div style={{ flex: 1, padding: "0 0 8px" }}>
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

      {/* ── BOTTOM NAV ── */}
      <nav className="nova-bnav" aria-label="Main navigation">
        <button className={`nova-nav-item ${view === "history" ? "active" : ""}`}
          onClick={() => setView("history")}>
          <i className="ti ti-chart-bar" />
          <span>Log</span>
          {view === "history" && <div className="nova-nav-dot" />}
        </button>

        <button className={`nova-nav-item ${view === "drink" ? "active" : ""}`}
          onClick={() => setView("drink")}>
          <i className="ti ti-bottle" />
          <span>Drink</span>
          {view === "drink" && <div className="nova-nav-dot" />}
        </button>

        {/* FAB — Camera */}
        <button className="nova-fab" onClick={() => setView("analyze")} aria-label="Analyze meal">
          <i className="ti ti-camera" />
        </button>

        <button className={`nova-nav-item ${view === "ingredient" ? "active" : ""}`}
          onClick={() => setView("ingredient")}>
          <i className="ti ti-search" />
          <span>Search</span>
          {view === "ingredient" && <div className="nova-nav-dot" />}
        </button>

        <button className={`nova-nav-item ${view === "plan" ? "active" : ""}`}
          onClick={() => setView("plan")}>
          <i className="ti ti-heart-rate-monitor" />
          <span>Plan</span>
          {view === "plan" && <div className="nova-nav-dot" />}
        </button>
      </nav>

      {/* Paywall */}
      {showPaywall && (
        <Paywall
          onClose={() => setShowPaywall(false)}
          onUpgrade={(plan) => { setCurrentPlan(plan); setShowPaywall(false); }}
        />
      )}
    </div>
  );
}
