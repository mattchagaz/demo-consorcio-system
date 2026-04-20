"use client";

import { Loader2 } from "lucide-react";

type Props = {
  current: number;
  total: number;
  label?: string;
};

export function ProgressBar({ current, total, label }: Props) {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div className="flex items-center gap-4 px-5 py-3 rounded-xl bg-white border border-indigo-200 shadow-sm animate-fade-in-up">
      <Loader2 className="h-5 w-5 text-indigo-600 animate-spin shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <p className="text-sm font-medium text-slate-700">
            {label ?? "Processando"}
          </p>
          <p className="text-sm tabular-nums font-semibold text-indigo-600">
            {current} / {total}
          </p>
        </div>
        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      <span className="text-xs font-medium text-slate-500 tabular-nums w-10 text-right">
        {pct}%
      </span>
    </div>
  );
}
