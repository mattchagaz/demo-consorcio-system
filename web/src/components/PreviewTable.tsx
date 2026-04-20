"use client";

import { useState, useMemo } from "react";
import { Filter, X } from "lucide-react";

export type Parcela = {
  ass: string;
  aviso: string;
  historico: string;
  vencto: string;
  pagto: string;
  bem: string;
  vl_cred: number;
  vl_devido: number;
  vl_pago: number;
  multa: number;
  juros: number;
  seguro: number;
  pct_pago: number;
  pct_difer: number;
};

export type ValoresPagos = {
  fundo_comum: number;
  fundo_reserva: number;
  taxa_administracao: number;
};

export type Extract = {
  data_emissao: string;
  grupo: string;
  cota: string;
  nome: string;
  contrato: string;
  contrato_valor_credito: number;
  lance_embutido: number;
  prazo_total: number;
  qtde_parcelas_pagas: number;
  conta_corrente: Parcela[];
  valores_pagos: ValoresPagos;
};

const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

type Filters = {
  grupo: string;
  cota: string;
  status: "" | "pago" | "pendente";
};

const emptyFilters: Filters = { grupo: "", cota: "", status: "" };

export function PreviewTable({ extracts }: { extracts: Extract[] }) {
  const [filters, setFilters] = useState<Filters>({ ...emptyFilters });
  const [showFilters, setShowFilters] = useState(false);

  // Build all rows
  const allRows = useMemo(
    () =>
      extracts.flatMap((e) =>
        [...e.conta_corrente]
          .sort((a, b) => parseInt(a.ass) - parseInt(b.ass))
          .map((p) => ({ e, p }))
      ),
    [extracts]
  );

  // Unique values for dropdowns
  const grupos = useMemo(
    () => [...new Set(extracts.map((e) => e.grupo.replace(/^0+/, "") || "0"))].sort(),
    [extracts]
  );
  const cotas = useMemo(() => {
    const filtered = filters.grupo
      ? extracts.filter((e) => (e.grupo.replace(/^0+/, "") || "0") === filters.grupo)
      : extracts;
    return [...new Set(filtered.map((e) => e.cota))].sort();
  }, [extracts, filters.grupo]);

  // Apply filters
  const rows = useMemo(() => {
    return allRows.filter(({ e, p }) => {
      if (filters.grupo && (e.grupo.replace(/^0+/, "") || "0") !== filters.grupo) return false;
      if (filters.cota && e.cota !== filters.cota) return false;
      if (filters.status === "pago" && !p.pagto) return false;
      if (filters.status === "pendente" && p.pagto) return false;
      return true;
    });
  }, [allRows, filters]);

  const hasActiveFilters = filters.grupo || filters.cota || filters.status;

  const clearFilters = () => {
    setFilters({ ...emptyFilters });
  };

  if (!extracts.length) return null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
      {/* Filter bar */}
      <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center gap-3 flex-wrap">
        <button
          onClick={() => setShowFilters((v) => !v)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition ${
            showFilters || hasActiveFilters
              ? "bg-indigo-50 border-indigo-200 text-indigo-700"
              : "bg-white border-slate-300 text-slate-600 hover:border-slate-400"
          }`}
        >
          <Filter className="h-3.5 w-3.5" />
          Filtros
          {hasActiveFilters && (
            <span className="ml-1 text-xs bg-indigo-600 text-white rounded-full px-1.5 py-0.5">
              {[filters.grupo, filters.cota, filters.status].filter(Boolean).length}
            </span>
          )}
        </button>

        {showFilters && (
          <>
            <select
              value={filters.grupo}
              onChange={(e) => setFilters((f) => ({ ...f, grupo: e.target.value, cota: "" }))}
              className="px-3 py-1.5 rounded-lg text-sm border border-slate-300 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">Todos os Grupos</option>
              {grupos.map((g) => (
                <option key={g} value={g}>
                  Grupo {g}
                </option>
              ))}
            </select>

            <select
              value={filters.cota}
              onChange={(e) => setFilters((f) => ({ ...f, cota: e.target.value }))}
              className="px-3 py-1.5 rounded-lg text-sm border border-slate-300 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">Todas as Cotas</option>
              {cotas.map((c) => (
                <option key={c} value={c}>
                  Cota {c}
                </option>
              ))}
            </select>

            <select
              value={filters.status}
              onChange={(e) =>
                setFilters((f) => ({ ...f, status: e.target.value as Filters["status"] }))
              }
              className="px-3 py-1.5 rounded-lg text-sm border border-slate-300 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">Todos os Status</option>
              <option value="pago">Pagas</option>
              <option value="pendente">Pendentes</option>
            </select>

            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 transition"
              >
                <X className="h-3.5 w-3.5" />
                Limpar
              </button>
            )}
          </>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto scroll-thin">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-900 text-white">
            <tr>
              <th className="px-3 py-2.5 text-left font-medium text-xs uppercase tracking-wide">#</th>
              <th className="px-3 py-2.5 text-left font-medium text-xs uppercase tracking-wide">Grupo</th>
              <th className="px-3 py-2.5 text-left font-medium text-xs uppercase tracking-wide">Cota</th>
              <th className="px-3 py-2.5 text-left font-medium text-xs uppercase tracking-wide">Contrato</th>
              <th className="px-3 py-2.5 text-left font-medium text-xs uppercase tracking-wide">Emissão</th>
              <th className="px-3 py-2.5 text-left font-medium text-xs uppercase tracking-wide">Prazo</th>
              <th className="px-3 py-2.5 text-center font-medium text-xs uppercase tracking-wide">Parcelas</th>
              <th className="px-3 py-2.5 text-left font-medium text-xs uppercase tracking-wide">Vencto</th>
              <th className="px-3 py-2.5 text-left font-medium text-xs uppercase tracking-wide">Pagto</th>
              <th className="px-3 py-2.5 text-right font-medium text-xs uppercase tracking-wide">Vl. Crédito</th>
              <th className="px-3 py-2.5 text-right font-medium text-xs uppercase tracking-wide">Vl. Devido</th>
              <th className="px-3 py-2.5 text-right font-medium text-xs uppercase tracking-wide">Vl. Pago</th>
              <th className="px-3 py-2.5 text-right font-medium text-xs uppercase tracking-wide">% Pago</th>
              <th className="px-3 py-2.5 text-right font-medium text-xs uppercase tracking-wide">Quota Consórcio</th>
              <th className="px-3 py-2.5 text-right font-medium text-xs uppercase tracking-wide">Fundo Reserva</th>
              <th className="px-3 py-2.5 text-right font-medium text-xs uppercase tracking-wide">Taxa ADM</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ e, p }, i) => (
              <tr
                key={i}
                className={i % 2 ? "bg-slate-50/60" : "bg-white"}
              >
                <td className="px-3 py-2 text-slate-400 tabular-nums">{i + 1}</td>
                <td className="px-3 py-2 text-slate-700">{e.grupo.replace(/^0+/, "")}</td>
                <td className="px-3 py-2 text-slate-700">{e.cota}</td>
                <td className="px-3 py-2 font-mono text-xs text-slate-500">{e.contrato}</td>
                <td className="px-3 py-2 text-slate-600 text-xs">{e.data_emissao}</td>
                <td className="px-3 py-2 text-slate-600 text-xs">
                  {String(e.qtde_parcelas_pagas).padStart(3, "0")}/{e.prazo_total}
                </td>
                <td className="px-3 py-2 text-center font-mono text-xs text-slate-600">{p.ass}</td>
                <td className="px-3 py-2 text-slate-700">{p.vencto}</td>
                <td className="px-3 py-2 text-slate-700">{p.pagto}</td>
                <td className="px-3 py-2 text-right tabular-nums text-slate-600">
                  {fmtBRL(p.vl_cred)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-slate-600">
                  {fmtBRL(p.vl_devido)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums font-semibold text-slate-900">
                  {fmtBRL(p.vl_pago)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-slate-500">
                  {p.pct_pago.toFixed(4)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-slate-600">
                  {fmtBRL(e.valores_pagos.fundo_comum)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-slate-600">
                  {fmtBRL(e.valores_pagos.fundo_reserva)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-slate-600">
                  {fmtBRL(e.valores_pagos.taxa_administracao)}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={16} className="px-4 py-8 text-center text-slate-400 text-sm">
                  Nenhuma parcela encontrada com os filtros selecionados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between">
        <span>
          {rows.length} parcela{rows.length === 1 ? "" : "s"} de {extracts.length}{" "}
          cota{extracts.length === 1 ? "" : "s"}
          {hasActiveFilters && ` (filtrado de ${allRows.length})`}
        </span>
      </div>
    </div>
  );
}
