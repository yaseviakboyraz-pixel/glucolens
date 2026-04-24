"use client";
import { useState } from "react";
import { saveProfile, getGLTargets, type UserProfile, type UserType } from "@/lib/storage";
import type { Lang } from "@/lib/i18n";

interface Props {
  lang: Lang;
  onComplete: () => void;
}

const profileLabels: Record<UserType, { title: string; desc: string; color: string }> = {
  healthy:      { title: "Healthy", desc: "General wellness & sugar awareness", color: "border-green-500 bg-green-950/50" },
  pre_diabetic: { title: "Pre-diabetic", desc: "Managing borderline blood sugar", color: "border-amber-500 bg-amber-950/50" },
  diabetic:     { title: "Diabetic", desc: "Active diabetes management", color: "border-red-500 bg-red-950/50" },
};

export function UserProfileSetup({ lang, onComplete }: Props) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [userType, setUserType] = useState<UserType>("healthy");

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
              <h1 className="text-2xl font-bold text-white mb-1">Welcome to GlucoLens</h1>
              <p className="text-gray-400">Let&apos;s personalize your glucose tracking experience.</p>
            </div>

            <div>
              <label className="text-sm text-gray-400 mb-2 block">Your name (optional)</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Yasevi"
                className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-teal-500"
              />
            </div>

            <button
              onClick={() => setStep(2)}
              className="w-full py-4 rounded-xl font-semibold text-white bg-teal-600 hover:bg-teal-500 transition-all"
            >
              Continue →
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-white mb-1">Your health profile</h2>
              <p className="text-gray-400">This sets your daily GL targets and warning thresholds.</p>
            </div>

            <div className="space-y-3">
              {(Object.entries(profileLabels) as [UserType, typeof profileLabels[UserType]][]).map(([type, label]) => {
                const t = getGLTargets(type);
                const selected = userType === type;
                return (
                  <button
                    key={type}
                    onClick={() => setUserType(type)}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                      selected ? label.color : "border-gray-800 bg-gray-900 hover:border-gray-700"
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-semibold text-white">{label.title}</div>
                        <div className="text-sm text-gray-400 mt-0.5">{label.desc}</div>
                      </div>
                      <div className="text-right ml-4 shrink-0">
                        <div className="text-xs text-gray-500">Daily target</div>
                        <div className="text-teal-400 font-bold">GL {t.daily}</div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
              <div className="text-sm text-gray-400">
                Your daily GL target: <span className="text-teal-400 font-bold">{targets.daily}</span>
                <span className="text-gray-600 ml-1">· Max per meal: GL {targets.meal}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="flex-1 py-4 rounded-xl font-semibold text-gray-400 bg-gray-900 hover:bg-gray-800 transition-all"
              >
                ← Back
              </button>
              <button
                onClick={handleComplete}
                className="flex-1 py-4 rounded-xl font-semibold text-white bg-teal-600 hover:bg-teal-500 transition-all"
              >
                Start Tracking
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
