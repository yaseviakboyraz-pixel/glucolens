"use client";
import { useState, useEffect } from "react";
import { getMeals, getWeeklyReport, getProfile } from "@/lib/storage";

interface CoachMessage {
  role: "user" | "coach";
  content: string;
}

export function AICoach() {
  const [messages, setMessages] = useState<CoachMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    // Initial greeting based on data
    generateGreeting();
  }, []);

  async function generateGreeting() {
    const profile = getProfile();
    const report = getWeeklyReport();
    const meals = getMeals().slice(0, 5);

    const contextPrompt = `You are GlucoLens AI Coach — a friendly, knowledgeable nutrition coach specializing in blood sugar management. Be concise, warm, and actionable.

User profile: ${profile?.userType || "healthy"}, daily GL target: ${profile?.dailyGLTarget || 100}
Weekly stats: avg daily GL ${report.avgDailyGL}, ${report.totalMeals} meals logged, ${report.highRiskMeals} high-risk meals, ${report.streak} day streak
Recent meals: ${meals.slice(0, 3).map(m => m.analysis.food_items.map(f => f.name_tr || f.name).join("+")).join(" | ")}

Generate a brief, personalized greeting (2-3 sentences max). Mention one specific insight from their data. End with an offer to help.`;

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: null,
          userType: profile?.userType || "healthy",
          mealContext: "__COACH_GREETING__",
          coachPrompt: contextPrompt,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const greeting = data.coachMessage || getDefaultGreeting(report);
        setMessages([{ role: "coach", content: greeting }]);
      } else {
        setMessages([{ role: "coach", content: getDefaultGreeting(report) }]);
      }
    } catch {
      setMessages([{ role: "coach", content: getDefaultGreeting(report) }]);
    }
  }

  function getDefaultGreeting(report: ReturnType<typeof getWeeklyReport>) {
    if (report.totalMeals === 0) {
      return "Hi! I'm your GlucoLens AI Coach 👋 Start by analyzing your first meal and I'll give you personalized insights!";
    }
    if (report.avgDailyGL > 80) {
      return `Hi! Your 7-day average GL is ${report.avgDailyGL} — slightly above the optimal range. I can help you identify which meals are causing the most impact. What would you like to know?`;
    }
    return `Hi! You're doing great with a ${report.avgDailyGL} average daily GL this week! ${report.streak > 0 ? `${report.streak}-day streak too 🔥` : ""} What can I help you with today?`;
  }

  async function sendMessage() {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMsg }]);
    setLoading(true);

    try {
      const profile = getProfile();
      const report = getWeeklyReport();
      const meals = getMeals().slice(0, 10);

      const coachPrompt = `You are GlucoLens AI Coach. Be concise (max 3-4 sentences), warm, and actionable.

User context:
- Profile: ${profile?.userType || "healthy"}, daily GL target: ${profile?.dailyGLTarget || 100}
- This week: avg GL ${report.avgDailyGL}, ${report.totalMeals} meals, ${report.highRiskMeals} high-risk, streak: ${report.streak} days
- Top foods: ${report.topFoods.join(", ")}
- Recent meals GL: ${meals.slice(0, 5).map(m => m.analysis.total_glycemic_load).join(", ")}

Previous conversation: ${messages.slice(-4).map(m => `${m.role}: ${m.content}`).join("\n")}

User asks: ${userMsg}

Respond helpfully and specifically. If asked about a food, give GL estimate. If asked for advice, be specific and actionable.`;

      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: coachPrompt }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessages(prev => [...prev, { role: "coach", content: data.message }]);
      } else {
        throw new Error("Coach unavailable");
      }
    } catch {
      setMessages(prev => [...prev, {
        role: "coach",
        content: "Sorry, I'm having trouble connecting right now. Try again in a moment!"
      }]);
    } finally {
      setLoading(false);
    }
  }

  const quickQuestions = [
    "What should I eat for breakfast?",
    "How can I lower my GL?",
    "Best snacks for my profile?",
    "Explain glycemic load",
  ];

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
            <div className="text-xs text-gray-500">AI nutrition assistant</div>
          </div>
        </div>
        <span className="text-gray-500 text-sm">{expanded ? "▲" : "▼"}</span>
      </button>

      {expanded && (
        <div className="border-t border-gray-800">
          {/* Messages */}
          <div className="max-h-64 overflow-y-auto p-4 space-y-3">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                  msg.role === "user"
                    ? "bg-teal-600 text-white"
                    : "bg-gray-800 text-gray-200"
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-800 rounded-xl px-3 py-2">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Quick questions */}
          {messages.length <= 1 && (
            <div className="px-4 pb-3 flex flex-wrap gap-2">
              {quickQuestions.map((q) => (
                <button
                  key={q}
                  onClick={() => { setInput(q); }}
                  className="text-xs px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-gray-200 rounded-full transition-all border border-gray-700"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="flex gap-2 px-4 pb-4">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Ask your coach..."
              className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-teal-500"
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || loading}
              className="px-3 py-2 bg-teal-600 hover:bg-teal-500 disabled:opacity-40 text-white rounded-xl text-sm transition-all"
            >
              →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
