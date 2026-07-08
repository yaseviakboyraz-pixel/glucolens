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
import { HealthTracker } from "@/components/health-tracker";
import { NotificationSettings } from "@/components/notification-settings";
import { getProfile, saveProfile, syncFromCloud, type UserProfile } from "@/lib/storage";
import { detectBrowserLang, getT, type Lang } from "@/lib/i18n";
import { onAuthStateChange, type User } from "@/lib/auth";
import { initPushNotifications } from "@/lib/push-notifications";
import { initNetworkMonitor, onNetworkChange, isOnline, type NetworkStatus } from "@/lib/network";
import { getCurrentPlan, type PlanId } from "@/lib/subscriptions";
import { AccountSettings } from "@/components/account-settings";
import { ClipboardList, HeartPulse, Camera, LayoutGrid, GlassWater, Search, CalendarDays, ChevronRight, Settings, User as UserIcon, Sun, Moon, Cloud, LineChart, Check } from "lucide-react";

type View = "setup" | "analyze" | "history" | "ingredient" | "menu" | "drink" | "plan" | "health" | "tools";

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
  const [showAccount, setShowAccount] = useState(false);
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("glucolens_lang") as Lang | null;
    setLang(saved || detectBrowserLang());
    const p = getProfile();
    setProfile(p);
    if (!p || !p.setupComplete) setView("setup");
    setLoaded(true);
    setShowHint(!localStorage.getItem("glucolens_hint_seen"));

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

  function dismissHint() {
    localStorage.setItem("glucolens_hint_seen", "1");
    setShowHint(false);
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
    return <AuthScreen lang={lang} onSuccess={() => { setShowAuth(false); refreshProfile(); }} />;
  }

  if (view === "setup") {
    return (
      <UserProfileSetup lang={lang} onComplete={() => { refreshProfile(); setView("analyze"); }} />
    );
  }

  const tx = getT(lang);

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

          {/* Account / settings */}
          <button onClick={() => setShowAccount(true)} className="nova-hbtn" title="Account & data">
            <Settings size={17} strokeWidth={1.75} color="var(--nova-text-2)" />
          </button>
          {/* Sign in (only when signed out) */}
          {!user && (
            <button onClick={() => setShowAuth(true)} className="nova-hbtn" title="Sign in">
              <UserIcon size={17} strokeWidth={1.75} color="var(--nova-text-2)" />
            </button>
          )}

          {/* Theme toggle */}
          <button onClick={toggleTheme} className="nova-hbtn" title="Toggle theme">
            {theme === "dark" ? <Sun size={17} strokeWidth={1.75} color="var(--nova-text-2)" /> : <Moon size={17} strokeWidth={1.75} color="var(--nova-text-2)" />}
          </button>

          {/* Language */}
          <LangSwitcher current={lang} onChange={handleLangChange} />
        </div>
      </header>

      {/* ── CLOUD SYNC INDICATOR ── */}
      {user && (
        <div style={{ padding: "4px 18px", display: "flex", alignItems: "center", gap: 6, borderBottom: "0.5px solid var(--nova-border)" }}>
          <Cloud size={13} strokeWidth={1.75} color="rgba(16,185,129,0.6)" />
          <span style={{ fontSize: 9, color: "var(--nova-text-4)", letterSpacing: 1 }}>{user.email}</span>
        </div>
      )}

      {/* ── CONTENT ── */}
      <div style={{ flex: 1, padding: "0 0 8px" }}>
        {view === "analyze" && (
          <>
            {showHint && (
              <div style={{ margin: "0 0 4px", padding: "12px 14px", background: "var(--nova-surface)", border: "0.5px solid var(--nova-border)", borderRadius: 16, position: "relative" }}>
                <button onClick={dismissHint} aria-label="dismiss" style={{ position: "absolute", top: 8, right: 10, background: "none", border: "none", color: "var(--nova-text-4)", fontSize: 16, cursor: "pointer", lineHeight: 1 }}>×</button>
                <div style={{ fontSize: 11, color: "var(--nova-text-2)", fontWeight: 500, marginBottom: 8 }}>
                  {tx.pg_hint_title}
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  {[
                    { Icon: Camera, t: tx.pg_hint_snap },
                    { Icon: LineChart, t: tx.pg_hint_see },
                    { Icon: Check, t: tx.pg_hint_choose },
                  ].map((s, idx) => (
                    <div key={idx} style={{ flex: 1, textAlign: "center", padding: "8px 4px", background: "var(--nova-bg)", borderRadius: 10, border: "0.5px solid var(--nova-border)" }}>
                      <s.Icon size={16} strokeWidth={1.75} color="var(--nova-purple)" style={{ display: "block", margin: "0 auto 4px" }} aria-hidden="true" />
                      <span style={{ fontSize: 8, color: "var(--nova-text-3)", lineHeight: 1.3 }}>{s.t}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <UploadAnalyzer
              userType={profile?.userType || "healthy"}
              lang={lang}
              onAnalysisComplete={refreshProfile}
            />
          </>
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
        {view === "health" && (
          <div className="px-4 py-4">
            <h2 className="text-white font-bold text-lg mb-1">🧘 {tx.pg_health_title}</h2>
            <p className="text-gray-500 text-xs mb-4">{tx.pg_health_sub}</p>
            <HealthTracker lang={lang} />
            <div className="mt-6">
              <h3 className="text-white font-semibold text-sm mb-3">🔔 {tx.pg_notif_settings}</h3>
              <NotificationSettings lang={lang} />
            </div>
          </div>
        )}
        {view === "tools" && (
          <div style={{ padding: "16px 16px 8px" }}>
            <div style={{ fontSize: 19, fontWeight: 600, color: "var(--nova-text-1)", marginBottom: 2 }}>
              {tx.pg_tools}
            </div>
            <div style={{ fontSize: 12, color: "var(--nova-text-3)", marginBottom: 16 }}>
              {tx.pg_tools_sub}
            </div>
            <div style={{ display: "grid", gap: 10 }}>
              {([
                { v: "drink", Icon: GlassWater, color: "rgba(6,182,212,0.9)", title: tx.pg_tool_drink, desc: tx.pg_tool_drink_d },
                { v: "ingredient", Icon: Search, color: "rgba(139,92,246,0.9)", title: tx.pg_tool_ing, desc: tx.pg_tool_ing_d },
                { v: "plan", Icon: CalendarDays, color: "rgba(16,185,129,0.9)", title: tx.pg_tool_plan, desc: tx.pg_tool_plan_d },
              ] as { v: View; Icon: typeof GlassWater; color: string; title: string; desc: string }[]).map(({ v, Icon, color, title, desc }) => (
                <button key={v} onClick={() => setView(v)}
                  style={{ display: "flex", alignItems: "center", gap: 12, textAlign: "left", padding: 14, borderRadius: 16, background: "var(--nova-surface)", border: "0.5px solid var(--nova-border)", cursor: "pointer", width: "100%" }}>
                  <div style={{ width: 42, height: 42, borderRadius: 12, background: "var(--nova-purple-dim)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Icon size={20} strokeWidth={1.75} color={color} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "var(--nova-text-1)" }}>{title}</div>
                    <div style={{ fontSize: 11, color: "var(--nova-text-3)", marginTop: 2, lineHeight: 1.4 }}>{desc}</div>
                  </div>
                  <ChevronRight size={16} strokeWidth={1.75} color="var(--nova-text-3)" />
                </button>
              ))}
            </div>
          </div>
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
          <ClipboardList size={22} strokeWidth={1.75} />
          <span>{tx.pg_nav_log}</span>
          {view === "history" && <div className="nova-nav-dot" />}
        </button>

        <button className={`nova-nav-item ${view === "health" ? "active" : ""}`}
          onClick={() => setView("health")}>
          <HeartPulse size={22} strokeWidth={1.75} />
          <span>{tx.pg_nav_health}</span>
          {view === "health" && <div className="nova-nav-dot" />}
        </button>

        {/* FAB — Analyze (core action) */}
        <button className="nova-fab" onClick={() => setView("analyze")} aria-label={tx.pg_analyze_meal}>
          <Camera size={22} strokeWidth={1.75} color="rgba(139,92,246,0.85)" />
        </button>

        <button className={`nova-nav-item ${["tools","drink","ingredient","plan","menu"].includes(view) ? "active" : ""}`}
          onClick={() => setView("tools")}>
          <LayoutGrid size={22} strokeWidth={1.75} />
          <span>{tx.pg_tools}</span>
          {["tools","drink","ingredient","plan","menu"].includes(view) && <div className="nova-nav-dot" />}
        </button>
      </nav>

      {/* Paywall */}
      {showPaywall && (
        <Paywall
          lang={lang}
          onClose={() => setShowPaywall(false)}
          onUpgrade={(plan) => { setCurrentPlan(plan); setShowPaywall(false); }}
        />
      )}

      {/* Account & data settings */}
      {showAccount && (
        <AccountSettings user={user} onClose={() => setShowAccount(false)} lang={lang} />
      )}
    </div>
  );
}
