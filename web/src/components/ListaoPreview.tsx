"use client";

import type { Extract } from "./PreviewTable";

const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function ListaoPreview({ extracts }: { extracts: Extract[] }) {
  if (!extracts.length) return null;

  // Build rows with calculated columns (mirrors xlsx_writer logic)
  let runSaldo = 0;
  let runPagamentos = 0;
  const rows = extracts.map((e, idx) => {
    const cotaContemplada = e.contrato_valor_credito ?? 0;
    const lanceEmb = e.lance_embutido ?? 0;
    const fc = e.valores_pagos?.fundo_comum ?? 0;
    const fr = e.valores_pagos?.fundo_reserva ?? 0;
    const txAdm = e.valores_pagos?.taxa_administracao ?? 0;
    const pagamentos = fc + fr + txAdm;
    const saldoContemp = cotaContemplada - lanceEmb;
    runSaldo += saldoContemp;
    runPagamentos += pagamentos;
    const saldoCreditoParcelas = saldoContemp - runPagamentos;

    return {
      mes: idx + 1,
      grupo: e.grupo,
      cota: e.cota,
      dataEmissao: e.data_emissao,
      cotaContemplada,
      fc,
      fr,
      txAdm,
      lanceEmb,
      saldoContemp,
      soma: runSaldo,
      pagamentos,
      saldoCreditoParcelas,
    };
  });

  const totalCota = rows.reduce((s, r) => s + r.cotaContemplada, 0);
  const totalFC = rows.reduce((s, r) => s + r.fc, 0);
  const totalFR = rows.reduce((s, r) => s + r.fr, 0);
  const totalTxAdm = rows.reduce((s, r) => s + r.txAdm, 0);
  const totalLance = rows.reduce((s, r) => s + r.lanceEmb, 0);
  const totalSaldo = rows.reduce((s, r) => s + r.saldoContemp, 0);
  const totalPag = rows.reduce((s, r) => s + r.pagamentos, 0);

  const headers = [
    "Mês", "Grupo", "Cota", "Emissão", "Cota contemplada",
    "Quota Consórcio", "Fundo Reserva", "Taxa ADM",
    "Cont. Lanc. Emb", "Saldo Contemplação", "Soma",
    "Pagamentos", "Saldo Crédito - Parcelas",
  ];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
      <div className="overflow-x-auto scroll-thin">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-900 text-white">
            <tr>
              {headers.map((h) => (
                <th
                  key={h}
                  className="px-3 py-2.5 text-center font-medium text-xs uppercase tracking-wide whitespace-nowrap"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr
                key={i}
                className={i % 2 ? "bg-slate-50/60" : "bg-white"}
              >
                <td className="px-3 py-2 text-center tabular-nums text-slate-400">{r.mes}</td>
                <td className="px-3 py-2 text-center text-slate-700">{r.grupo.replace(/^0+/, "")}</td>
                <td className="px-3 py-2 text-center text-slate-700">{r.cota}</td>
                <td className="px-3 py-2 text-center text-slate-600 text-xs">{r.dataEmissao}</td>
                <td className="px-3 py-2 text-right tabular-nums text-slate-700">{fmtBRL(r.cotaContemplada)}</td>
                <td className="px-3 py-2 text-right tabular-nums text-slate-600">{fmtBRL(r.fc)}</td>
                <td className="px-3 py-2 text-right tabular-nums text-slate-600">{fmtBRL(r.fr)}</td>
                <td className="px-3 py-2 text-right tabular-nums text-slate-600">{fmtBRL(r.txAdm)}</td>
                <td className="px-3 py-2 text-right tabular-nums text-slate-600">{fmtBRL(r.lanceEmb)}</td>
                <td className="px-3 py-2 text-right tabular-nums font-medium text-slate-800">{fmtBRL(r.saldoContemp)}</td>
                <td className="px-3 py-2 text-right tabular-nums text-indigo-600">{fmtBRL(r.soma)}</td>
                <td className="px-3 py-2 text-right tabular-nums text-slate-700">{fmtBRL(r.pagamentos)}</td>
                <td className="px-3 py-2 text-right tabular-nums font-semibold text-slate-900">{fmtBRL(r.saldoCreditoParcelas)}</td>
              </tr>
            ))}
            <tr className="bg-slate-100 border-t-2 border-slate-300">
              <td className="px-3 py-2" />
              <td className="px-3 py-2" />
              <td className="px-3 py-2 text-right font-bold text-slate-700 text-xs uppercase">Total</td>
              <td className="px-3 py-2" />
              <td className="px-3 py-2 text-right tabular-nums font-bold text-slate-900">{fmtBRL(totalCota)}</td>
              <td className="px-3 py-2 text-right tabular-nums font-bold text-slate-700">{fmtBRL(totalFC)}</td>
              <td className="px-3 py-2 text-right tabular-nums font-bold text-slate-700">{fmtBRL(totalFR)}</td>
              <td className="px-3 py-2 text-right tabular-nums font-bold text-slate-700">{fmtBRL(totalTxAdm)}</td>
              <td className="px-3 py-2 text-right tabular-nums font-bold text-slate-700">{fmtBRL(totalLance)}</td>
              <td className="px-3 py-2 text-right tabular-nums font-bold text-slate-900">{fmtBRL(totalSaldo)}</td>
              <td className="px-3 py-2" />
              <td className="px-3 py-2 text-right tabular-nums font-bold text-slate-900">{fmtBRL(totalPag)}</td>
              <td className="px-3 py-2" />
            </tr>
          </tbody>
        </table>
      </div>
      <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 text-xs text-slate-500">
        {extracts.length} cota{extracts.length === 1 ? "" : "s"} · Formato idêntico ao XLSX exportado
      </div>
    </div>
  );
}
