"use client";

import { AlertCircle, CheckCircle2, X } from "lucide-react";
import { useEffect } from "react";

type Props = {
  kind: "error" | "success";
  message: string;
  onDismiss: () => void;
};

export function Toast({ kind, message, onDismiss }: Props) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 5000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  const isError = kind === "error";
  const Icon = isError ? AlertCircle : CheckCircle2;

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-fade-in-up">
      <div
        className={`flex items-start gap-3 min-w-[300px] max-w-md px-4 py-3 rounded-xl shadow-2xl border backdrop-blur-sm ${
          isError
            ? "bg-red-50/95 border-red-200 text-red-900"
            : "bg-emerald-50/95 border-emerald-200 text-emerald-900"
        }`}
      >
        <Icon
          className={`h-5 w-5 shrink-0 mt-0.5 ${
            isError ? "text-red-500" : "text-emerald-500"
          }`}
        />
        <p className="text-sm flex-1">{message}</p>
        <button
          onClick={onDismiss}
          className="text-slate-400 hover:text-slate-700 transition"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
