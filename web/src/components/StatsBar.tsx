"use client";

import { Users, Receipt, CheckCircle2, Banknote } from "lucide-react";
import type { Extract } from "./PreviewTable";

const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function StatsBar({ extracts }: { extracts: Extract[] }) {
  if (!extracts.length) return null;

  const totalCotas = extracts.length;
  const totalParcelas = extracts.reduce((s, e) => s + e.conta_corrente.length, 0);
  const totalPago = extracts.reduce(
    (s, e) => s + e.conta_corrente.reduce((ss, p) => ss + p.vl_pago, 0),
    0
  );
  const totalCredito = extracts.reduce((s, e) => {
    const latest = e.conta_corrente.reduce(
      (max, p) => (parseInt(p.ass) > parseInt(max.ass) ? p : max),
      e.conta_corrente[0]
    );
    return s + (latest?.vl_cred ?? 0);
  }, 0);

  const items = [
    {
      label: "Cotas",
      value: String(totalCotas),
      icon: Users,
      color: "from-indigo-500 to-indigo-600",
      bg: "bg-indigo-50",
      text: "text-indigo-600",
    },
    {
      label: "Parcelas pagas",
      value: String(totalParcelas),
      icon: CheckCircle2,
      color: "from-emerald-500 to-emerald-600",
      bg: "bg-emerald-50",
      text: "text-emerald-600",
    },
    {
      label: "Total pago",
      value: fmtBRL(totalPago),
      icon: Banknote,
      color: "from-purple-500 to-purple-600",
      bg: "bg-purple-50",
      text: "text-purple-600",
    },
    {
      label: "Crédito total",
      value: fmtBRL(totalCredito),
      icon: Receipt,
      color: "from-amber-500 to-orange-500",
      bg: "bg-amber-50",
      text: "text-amber-600",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 animate-fade-in-up">
      {items.map((it) => (
        <div
          key={it.label}
          className="relative overflow-hidden bg-white rounded-2xl border border-slate-200 p-4 hover:shadow-md hover:border-slate-300 transition"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                {it.label}
              </p>
              <p className="mt-2 text-xl font-bold text-slate-900 tabular-nums">
                {it.value}
              </p>
            </div>
            <div className={`h-10 w-10 rounded-xl ${it.bg} flex items-center justify-center`}>
              <it.icon className={`h-5 w-5 ${it.text}`} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
