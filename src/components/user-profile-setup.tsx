"use client";
import { useState } from "react";
import { saveProfile, getGLTargets, type UserProfile, type UserType } from "@/lib/storage";
import { getT, type Lang } from "@/lib/i18n";

interface Props {
  lang: Lang;
  onComplete: () => void;
}

const profileMeta: Record<UserType, { titleKey: string; descKey: string; color: string }> = {
  healthy:      { titleKey: "pt_healthy", descKey: "pt_healthy_desc", color: "border-green-500 bg-green-950/50" },
  pre_diabetic: { titleKey: "pt_pre", descKey: "pt_pre_desc", color: "border-amber-500 bg-amber-950/50" },
  diabetic:     { titleKey: "pt_diabetic", descKey: "pt_diabetic_desc", color: "border-red-500 bg-red-950/50" },
};

export function UserProfileSetup({ lang, onComplete }: Props) {
  const tx = getT(lang);
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [userType, setUserType] = useState<UserType>("healthy");
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);

  const targets = getGLTargets(userType);

  function handleComplete() {
    const targets = getGLTargets(userType);
    const profile: UserProfile = {
      name: name.trim() || "User",
      userType,
      dailyGLTarget: targets.daily,
      setupComplete: true,
    };
    saveProfile(profile);
    onComplete();
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Progress */}
        <div className="flex gap-2 mb-8">
          {[1, 2].map((s) => (
            <div key={s} className={`h-1 flex-1 rounded-full transition-all ${s <= step ? "bg-teal-500" : "bg-gray-800"}`} />
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-white mb-1">{tx.ob_welcome}</h1>
              <p className="text-gray-400">{tx.ob_welcome_sub}</p>
            </div>

            <div>
              <label className="text-sm text-gray-400 mb-2 block">{tx.ob_name_label}</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={tx.ob_name_ph}
                className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-teal-500"
              />
            </div>

            <button
              onClick={() => setStep(2)}
              className="w-full py-4 rounded-xl font-semibold text-white bg-teal-600 hover:bg-teal-500 transition-all"
            >
              {tx.ob_continue}
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-white mb-1">{tx.ob_profile_title}</h2>
              <p className="text-gray-400">{tx.ob_profile_sub}</p>
            </div>

            <div className="space-y-3">
              {(Object.entries(profileMeta) as [UserType, typeof profileMeta[UserType]][]).map(([type, meta]) => {
                const tg = getGLTargets(type);
                const selected = userType === type;
                return (
                  <button
                    key={type}
                    onClick={() => setUserType(type)}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                      selected ? meta.color : "border-gray-800 bg-gray-900 hover:border-gray-700"
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-semibold text-white">{tx[meta.titleKey]}</div>
                        <div className="text-sm text-gray-400 mt-0.5">{tx[meta.descKey]}</div>
                      </div>
                      <div className="text-right ml-4 shrink-0">
                        <div className="text-xs text-gray-500">{tx.ob_daily_target}</div>
                        <div className="text-teal-400 font-bold">GL {tg.daily}</div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
              <div className="text-sm text-gray-400">
                {tx.ob_your_daily_target} <span className="text-teal-400 font-bold">{targets.daily}</span>
                <span className="text-gray-600 ml-1">· {tx.ob_max_per_meal} {targets.meal}</span>
              </div>
            </div>

            {/* Disclaimer */}
            <div className="bg-amber-950/30 border border-amber-500/20 rounded-xl p-4">
              <p className="text-amber-200/80 text-xs leading-relaxed">
                ⚠️ <strong>{tx.ob_disclaimer_important}</strong> {tx.ob_disclaimer_body}
              </p>
              <label className="flex items-start gap-3 mt-3 cursor-pointer">
                <input type="checkbox" checked={disclaimerAccepted}
                  onChange={e => setDisclaimerAccepted(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-teal-500 shrink-0" />
                <span className="text-xs text-gray-400">
                  {tx.ob_disclaimer_agree}{" "}
                  <a href="/privacy" target="_blank" className="text-teal-400 underline">{tx.ob_privacy}</a>
                  {" "}{tx.ob_and}{" "}
                  <a href="/terms" target="_blank" className="text-teal-400 underline">{tx.ob_terms}</a>.
                </span>
              </label>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="flex-1 py-4 rounded-xl font-semibold text-gray-400 bg-gray-900 hover:bg-gray-800 transition-all"
              >
                {tx.ob_back}
              </button>
              <button
                onClick={handleComplete}
                disabled={!disclaimerAccepted}
                className="flex-1 py-4 rounded-xl font-semibold text-white bg-teal-600 hover:bg-teal-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                {tx.ob_start}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
