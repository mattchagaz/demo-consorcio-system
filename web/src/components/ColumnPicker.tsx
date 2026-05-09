"use client";

import { useState } from "react";
import { Settings2, X } from "lucide-react";
import { cn } from "@/lib/utils";

export const ALL_COLUMNS = [
  { key: "num", label: "#" },
  { key: "grupo", label: "Grupo" },
  { key: "cota", label: "Cota" },
  { key: "contrato", label: "Contrato" },
  { key: "emissao", label: "Emissão" },
  { key: "prazo", label: "Prazo" },
  { key: "parcelas", label: "Parcelas" },
  { key: "plano_taxa_adm", label: "Taxa Adm (%)" },
  { key: "plano_fundo_reserva", label: "Fundo Reserva (%)" },
  { key: "plano_pct_mensal_fundo_comum", label: "% Mensal Fundo Comum" },
  { key: "plano_pct_mensal_com_taxas", label: "% Mensal c/ Taxas" },
  { key: "vencto", label: "Vencto" },
  { key: "pagto", label: "Pagto" },
  { key: "vl_credito", label: "Vl. Crédito" },
  { key: "vl_devido", label: "Vl. Devido" },
  { key: "vl_pago", label: "Vl. Pago" },
  { key: "multa", label: "Multa" },
  { key: "juros", label: "Juros" },
  { key: "seguro", label: "Seguro" },
  { key: "pct_pago", label: "% Pago" },
  { key: "pct_difer", label: "% Difer" },
  { key: "quota_consorcio", label: "Fundo Comum Pago" },
  { key: "quota_consorcio_pct", label: "% Fundo Comum Pago" },
  { key: "fundo_reserva", label: "Fundo Reserva" },
  { key: "fundo_reserva_pct", label: "% Fundo Reserva Pago" },
  { key: "taxa_adm", label: "Taxa ADM" },
  { key: "taxa_adm_pct", label: "% Taxa ADM Paga" },
  { key: "adesao_pago", label: "Adesão Paga" },
  { key: "adesao_pago_pct", label: "% Adesão Paga" },
  { key: "seguros_pagos", label: "Seguros Pagos" },
  { key: "seguros_pagos_pct", label: "% Seguros Pagos" },
  { key: "multas_pagas", label: "Multas Pagas" },
  { key: "multas_pagas_pct", label: "% Multas Pagas" },
  { key: "juros_pagos", label: "Juros Pagos" },
  { key: "juros_pagos_pct", label: "% Juros Pagos" },
  { key: "outros_valores_pagos", label: "Outros Valores Pagos" },
  { key: "outros_valores_pagos_pct", label: "% Outros Valores Pagos" },
  { key: "diferenca_parcela_paga", label: "Diferença Parcela Paga" },
  { key: "diferenca_parcela_paga_pct", label: "% Diferença Parcela Paga" },
  { key: "total_pago_valores", label: "Total Pago" },
  { key: "total_pago_valores_pct", label: "% Total Pago" },
  { key: "pagar_fundo_comum", label: "Fundo Comum a Pagar" },
  { key: "pagar_fundo_comum_pct", label: "% Fundo Comum a Pagar" },
  { key: "pagar_fundo_reserva", label: "Fundo Reserva a Pagar" },
  { key: "pagar_fundo_reserva_pct", label: "% Fundo Reserva a Pagar" },
  { key: "pagar_taxa_adm", label: "Taxa ADM a Pagar" },
  { key: "pagar_taxa_adm_pct", label: "% Taxa ADM a Pagar" },
  { key: "pagar_adesao", label: "Adesão a Pagar" },
  { key: "pagar_adesao_pct", label: "% Adesão a Pagar" },
  { key: "pagar_seguros", label: "Seguros a Pagar" },
  { key: "pagar_seguros_pct", label: "% Seguros a Pagar" },
  { key: "pagar_multas", label: "Multas a Pagar" },
  { key: "pagar_multas_pct", label: "% Multas a Pagar" },
  { key: "pagar_juros", label: "Juros a Pagar" },
  { key: "pagar_juros_pct", label: "% Juros a Pagar" },
  { key: "pagar_outros_valores", label: "Outros Valores a Pagar" },
  { key: "pagar_outros_valores_pct", label: "% Outros Valores a Pagar" },
  { key: "total_a_pagar", label: "Total a Pagar" },
  { key: "total_a_pagar_pct", label: "% Total a Pagar" },
] as const;

export type ColumnKey = (typeof ALL_COLUMNS)[number]["key"];

const DEFAULT_KEYS = ALL_COLUMNS.map((c) => c.key);

type Props = {
  selected: ColumnKey[];
  onChange: (cols: ColumnKey[]) => void;
};

export function ColumnPicker({ selected, onChange }: Props) {
  const [open, setOpen] = useState(false);

  const toggle = (key: ColumnKey) => {
    if (selected.includes(key)) {
      if (selected.length <= 1) return;
      onChange(selected.filter((k) => k !== key));
    } else {
      const ordered = ALL_COLUMNS.filter(
        (c) => selected.includes(c.key) || c.key === key
      ).map((c) => c.key);
      onChange(ordered);
    }
  };

  const selectAll = () => onChange([...DEFAULT_KEYS]);

  const customized = selected.length < ALL_COLUMNS.length;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border transition",
          customized
            ? "bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100"
            : "bg-white border-slate-300 text-slate-700 hover:border-slate-400 hover:bg-slate-50"
        )}
      >
        <Settings2 className="h-4 w-4" />
        Colunas
        {customized && (
          <span className="ml-1 text-xs bg-indigo-600 text-white rounded-full px-1.5 py-0.5">
            {selected.length}/{ALL_COLUMNS.length}
          </span>
        )}
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute left-0 bottom-full mb-2 z-50 w-72 bg-white rounded-2xl border border-slate-200 shadow-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-900">
                Colunas do Excel
              </p>
              <button
                onClick={() => setOpen(false)}
                className="h-6 w-6 rounded-lg flex items-center justify-center hover:bg-slate-100 text-slate-400"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {ALL_COLUMNS.map((col) => (
                <label
                  key={col.key}
                  className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-slate-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(col.key)}
                    onChange={() => toggle(col.key)}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-slate-700">{col.label}</span>
                </label>
              ))}
            </div>
            <button
              onClick={selectAll}
              className="w-full text-xs text-center text-indigo-600 hover:text-indigo-800 font-medium py-1"
            >
              Selecionar todas
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export { DEFAULT_KEYS };
