"use client";
import { useState, useEffect, useRef } from "react";
import { getMeals, getWeeklyReport, getProfile } from "@/lib/storage";
import { getT, type Lang } from "@/lib/i18n";

const LANG_NAMES: Record<Lang, string> = { en:"English", tr:"Turkish", zh:"Chinese", hi:"Hindi", es:"Spanish", fr:"French", ar:"Arabic", pt:"Portuguese", ru:"Russian", de:"German" };

interface CoachMessage {
  role: "user" | "coach";
  content: string;
  timestamp?: number;
}

const STORAGE_KEY = "glucolens_coach_messages";
const MAX_STORED = 40;

function loadMessages(): CoachMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveMessages(msgs: CoachMessage[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(msgs.slice(-MAX_STORED)));
}

export function AICoach({ lang }: { lang: Lang }) {
  const tx = getT(lang);
  const [messages, setMessages] = useState<CoachMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const profile = typeof window !== "undefined" ? getProfile() : null;

  const quickQuestions = ({
    diabetic: [tx.aic_q_dia_1, tx.aic_q_dia_2, tx.aic_q_dia_3, tx.aic_q_dia_4],
    pre_diabetic: [tx.aic_q_pre_1, tx.aic_q_pre_2, tx.aic_q_pre_3, tx.aic_q_pre_4],
    healthy: [tx.aic_q_hea_1, tx.aic_q_hea_2, tx.aic_q_hea_3, tx.aic_q_hea_4],
  } as Record<string, string[]>)[profile?.userType || "healthy"];

  useEffect(() => {
    const stored = loadMessages();
    if (stored.length > 0) {
      setMessages(stored);
      setInitialized(true);
    } else {
      generateGreeting();
    }
  }, []);

  useEffect(() => {
    if (expanded) {
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }
  }, [messages, expanded]);

  async function generateGreeting() {
    const report = getWeeklyReport();
    const meals = getMeals().slice(0, 5);
    const lastMeal = meals[0];

    const prompt = `You are GlucoLens AI Coach. Generate a brief, warm, personalized greeting in ${LANG_NAMES[lang]} (2-3 sentences max).

User: ${profile?.name || "there"}, type: ${profile?.userType || "healthy"}, daily GL target: ${profile?.dailyGLTarget || 60}
Weekly: avg GL ${report?.avgDailyGL ?? 0}, ${report?.totalMeals ?? 0} meals, streak: ${report?.streak ?? 0} days, ${report?.highRiskMeals ?? 0} high-risk meals
${lastMeal ? `Last meal: ${lastMeal.analysis.food_items.map(f => f.name_tr || f.name).join(", ")} — GL ${lastMeal.analysis.total_glycemic_load}` : "No meals yet"}

If they have data, comment on ONE specific insight. End with a concrete offer to help. Be personal, not generic.`;

    try {
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      const greeting: CoachMessage = {
        role: "coach",
        content: data.message || getFallbackGreeting(report),
        timestamp: Date.now(),
      };
      setMessages([greeting]);
      saveMessages([greeting]);
    } catch {
      const greeting: CoachMessage = {
        role: "coach",
        content: getFallbackGreeting(getWeeklyReport()),
        timestamp: Date.now(),
      };
      setMessages([greeting]);
      saveMessages([greeting]);
    }
    setInitialized(true);
  }

  function getFallbackGreeting(report: ReturnType<typeof getWeeklyReport>) {
    if (!report || report.totalMeals === 0) {
      return tx.aic_fb_empty;
    }
    if (report.avgDailyGL > 80) {
      return tx.aic_fb_high.replace("{gl}", String(report.avgDailyGL));
    }
    const streak = report.streak > 1 ? tx.aic_fb_streak.replace("{n}", String(report.streak)) : "";
    return tx.aic_fb_good.replace("{gl}", String(report.avgDailyGL)).replace("{streak}", streak);
  }

  async function sendMessage(text?: string) {
    const userText = (text || input).trim();
    if (!userText || loading) return;
    setInput("");

    const userMsg: CoachMessage = { role: "user", content: userText, timestamp: Date.now() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    saveMessages(newMessages);
    setLoading(true);

    try {
      const report = getWeeklyReport();
      const meals = getMeals().slice(0, 10);
      const lastMeal = meals[0];

      const coachPrompt = `You are GlucoLens AI Coach — a warm, knowledgeable nutrition coach specializing in glycemic management.
The user's interface language is ${LANG_NAMES[lang]}. Respond in the SAME language as the user's message (default to ${LANG_NAMES[lang]}). Be concise (3-5 sentences), specific, and actionable. No lists unless asked.

User profile: ${profile?.name || "User"}, type: ${profile?.userType || "healthy"}, daily GL target: ${profile?.dailyGLTarget || 60}
Weekly stats: avg GL ${report?.avgDailyGL ?? 0}, ${report?.totalMeals ?? 0} meals, ${report?.highRiskMeals ?? 0} high-risk meals, streak: ${report?.streak ?? 0} days
Top foods: ${report?.topFoods?.join(", ") ?? "none yet"}
Recent meal GLs: ${meals.slice(0, 5).map(m => m.analysis.total_glycemic_load).join(", ")}
${lastMeal ? `Last meal: ${lastMeal.analysis.food_items.map(f => f.name_tr || f.name).join(", ")} — GL ${lastMeal.analysis.total_glycemic_load}, risk: ${lastMeal.analysis.glucose_risk}` : ""}

Conversation history:
${newMessages.slice(-6).map(m => `${m.role === "user" ? "User" : "Coach"}: ${m.content}`).join("\n")}

Respond helpfully. If asked about a food, give GL estimate. If asked for advice, be specific to their profile data.`;

      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: coachPrompt }),
      });

      const data = await res.json();
      const coachMsg: CoachMessage = {
        role: "coach",
        content: data.message || tx.aic_err_offline,
        timestamp: Date.now(),
      };
      const updatedMessages = [...newMessages, coachMsg];
      setMessages(updatedMessages);
      saveMessages(updatedMessages);
    } catch {
      const errMsg: CoachMessage = {
        role: "coach",
        content: tx.aic_err_conn,
        timestamp: Date.now(),
      };
      const updatedMessages = [...newMessages, errMsg];
      setMessages(updatedMessages);
      saveMessages(updatedMessages);
    } finally {
      setLoading(false);
    }
  }

  function clearHistory() {
    localStorage.removeItem(STORAGE_KEY);
    setMessages([]);
    setInitialized(false);
    generateGreeting();
  }

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-800/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-sm">
            🤖
          </div>
          <div className="text-left">
            <div className="text-sm font-medium text-white">GlucoLens Coach</div>
            <div className="text-xs text-gray-500">
              {messages.length > 1 ? `${messages.length} ${tx.aic_msgs_saved}` : tx.aic_subtitle}
            </div>
          </div>
        </div>
        <span className="text-gray-500 text-sm">{expanded ? "▲" : "▼"}</span>
      </button>

      {expanded && (
        <div className="border-t border-gray-800">
          {/* Messages */}
          <div className="max-h-72 overflow-y-auto p-4 space-y-3">
            {!initialized && (
              <div className="flex justify-start">
                <div className="bg-gray-800 rounded-xl px-3 py-2">
                  <div className="flex gap-1">
                    {[0, 150, 300].map(delay => (
                      <div key={delay} className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"
                        style={{ animationDelay: `${delay}ms` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-teal-600 text-white rounded-br-sm"
                    : "bg-gray-800 text-gray-200 rounded-bl-sm"
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-800 rounded-xl px-3 py-2">
                  <div className="flex gap-1">
                    {[0, 150, 300].map(delay => (
                      <div key={delay} className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"
                        style={{ animationDelay: `${delay}ms` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick questions — show if ≤ 2 messages or explicitly */}
          {messages.length <= 2 && (
            <div className="px-4 pb-3 flex flex-wrap gap-1.5">
              {quickQuestions.map((q) => (
                <button key={q} onClick={() => sendMessage(q)}
                  className="text-xs px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-gray-200 rounded-full transition-all border border-gray-700">
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Input row */}
          <div className="flex gap-2 px-4 pb-4">
            <input type="text" value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder={tx.aic_placeholder}
              className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-teal-500"
            />
            <button onClick={() => sendMessage()} disabled={!input.trim() || loading}
              className="px-3 py-2 bg-teal-600 hover:bg-teal-500 disabled:opacity-40 text-white rounded-xl text-sm transition-all">
              →
            </button>
            {messages.length > 3 && (
              <button onClick={clearHistory} title={tx.aic_reset}
                className="px-2 py-2 text-gray-600 hover:text-gray-400 transition-colors text-xs">
                🔄
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
