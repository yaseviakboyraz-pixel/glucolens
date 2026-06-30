"use client";
import { Component, type ReactNode } from "react";
import { getT, type Lang } from "@/lib/i18n";

interface Props { children: ReactNode; }
interface State { hasError: boolean; error: Error | null; }

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    // Log to monitoring service in production
    if (process.env.NODE_ENV === "production") {
      console.error("[GlucoLens Error]", error.message);
    }
  }

  render() {
    if (this.state.hasError) {
      const lang = (typeof window !== "undefined" ? (localStorage.getItem("glucolens_lang") as Lang) : null) || "en";
      const tx = getT(lang);
      return (
        <div className="min-h-screen bg-gray-950 flex items-center justify-center px-6">
          <div className="text-center max-w-sm">
            <div className="text-5xl mb-4">⚠️</div>
            <h2 className="text-white text-xl font-bold mb-2">{tx.au_err_generic}</h2>
            <p className="text-gray-500 text-sm mb-6">
              {this.state.error?.message || tx.eb_body}
            </p>
            <button
              onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload(); }}
              className="px-6 py-3 bg-teal-600 hover:bg-teal-500 text-white rounded-xl font-semibold text-sm transition-all"
            >
              {tx.eb_reload}
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
