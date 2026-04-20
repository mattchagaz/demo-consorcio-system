"use client";

import { useState } from "react";
import { ChevronDown, Building2, Hash } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Extract } from "./PreviewTable";

const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function CotaCards({ extracts }: { extracts: Extract[] }) {
  if (!extracts.length) return null;
  return (
    <div className="space-y-3">
      {extracts.map((e, i) => (
        <CotaCard key={`${e.grupo}-${e.cota}-${i}`} extract={e} />
      ))}
    </div>
  );
}

function CotaCard({ extract: e }: { extract: Extract }) {
  const [open, setOpen] = useState(true);

  const totalPago = e.conta_corrente.reduce((s, p) => s + p.vl_pago, 0);
  const parcelas = [...e.conta_corrente].sort(
    (a, b) => parseInt(a.ass) - parseInt(b.ass)
  );
  const latest = parcelas[parcelas.length - 1];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:border-slate-300 transition">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition text-left"
      >
        <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm shrink-0">
          {e.cota.split("-")[0].slice(-3)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-slate-900 truncate">
              {e.nome}
            </p>
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
              {String(e.qtde_parcelas_pagas).padStart(3, "0")}/{e.prazo_total}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1">
              <Building2 className="h-3 w-3" /> Grupo {e.grupo.replace(/^0+/, "")}
            </span>
            <span className="inline-flex items-center gap-1">
              <Hash className="h-3 w-3" /> Cota {e.cota}
            </span>
            <span className="font-mono text-[10px] text-slate-400 hidden sm:inline">
              {e.contrato}
            </span>
            {e.data_emissao && (
              <span className="text-[10px] text-slate-400 hidden sm:inline">
                Emissão: {e.data_emissao}
              </span>
            )}
          </div>
        </div>
        <div className="hidden sm:block text-right">
          <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">
            Última parcela
          </p>
          <p className="text-sm font-semibold text-slate-900 tabular-nums">
            {latest ? fmtBRL(latest.vl_pago) : "—"}
          </p>
        </div>
        <ChevronDown
          className={cn(
            "h-5 w-5 text-slate-400 transition-transform shrink-0",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <div className="border-t border-slate-100 bg-slate-50/50">
          <div className="overflow-x-auto scroll-thin">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-500 uppercase tracking-wide">
                  <th className="px-4 py-2 text-left font-medium">Ass</th>
                  <th className="px-4 py-2 text-left font-medium">Vencto</th>
                  <th className="px-4 py-2 text-left font-medium">Pagto</th>
                  <th className="px-4 py-2 text-right font-medium">Vl. Crédito</th>
                  <th className="px-4 py-2 text-right font-medium">Vl. Devido</th>
                  <th className="px-4 py-2 text-right font-medium">Vl. Pago</th>
                  <th className="px-4 py-2 text-right font-medium">% Pago</th>
                  <th className="px-4 py-2 text-right font-medium">Quota Consórcio</th>
                  <th className="px-4 py-2 text-right font-medium">Fundo Reserva</th>
                  <th className="px-4 py-2 text-right font-medium">Taxa ADM</th>
                </tr>
              </thead>
              <tbody>
                {parcelas.map((p) => (
                  <tr
                    key={p.ass}
                    className="border-t border-slate-100 hover:bg-white transition"
                  >
                    <td className="px-4 py-2 font-mono text-xs text-slate-600">
                      {p.ass}
                    </td>
                    <td className="px-4 py-2 text-slate-700">{p.vencto}</td>
                    <td className="px-4 py-2 text-slate-700">{p.pagto}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-slate-600">
                      {fmtBRL(p.vl_cred)}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums text-slate-600">
                      {fmtBRL(p.vl_devido)}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums font-semibold text-slate-900">
                      {fmtBRL(p.vl_pago)}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums text-slate-500">
                      {p.pct_pago.toFixed(4)}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums text-slate-600">
                      {fmtBRL(e.valores_pagos.fundo_comum)}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums text-slate-600">
                      {fmtBRL(e.valores_pagos.fundo_reserva)}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums text-slate-600">
                      {fmtBRL(e.valores_pagos.taxa_administracao)}
                    </td>
                  </tr>
                ))}
                <tr className="border-t-2 border-slate-200 bg-white">
                  <td colSpan={5} className="px-4 py-2 text-right text-xs font-medium text-slate-500 uppercase">
                    Total pago
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums font-bold text-indigo-600">
                    {fmtBRL(totalPago)}
                  </td>
                  <td />
                  <td />
                  <td />
                  <td />
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
