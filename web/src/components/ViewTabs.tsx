"use client";

import { LayoutGrid, Table2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type View = "cards" | "table";

export function ViewTabs({
  value,
  onChange,
}: {
  value: View;
  onChange: (v: View) => void;
}) {
  const tabs: { id: View; label: string; icon: typeof LayoutGrid }[] = [
    { id: "cards", label: "Por Cota", icon: LayoutGrid },
    { id: "table", label: "Todas as Parcelas", icon: Table2 },
  ];

  return (
    <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition",
            value === t.id
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-600 hover:text-slate-900"
          )}
        >
          <t.icon className="h-4 w-4" />
          {t.label}
        </button>
      ))}
    </div>
  );
}
