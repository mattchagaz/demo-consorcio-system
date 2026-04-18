"use client";

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

export type Extract = {
  grupo: string;
  cota: string;
  nome: string;
  contrato: string;
  prazo_total: number;
  qtde_parcelas_pagas: number;
  conta_corrente: Parcela[];
};

const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function PreviewTable({ extracts }: { extracts: Extract[] }) {
  if (!extracts.length) return null;

  const rows = extracts.flatMap((e) =>
    [...e.conta_corrente]
      .sort((a, b) => parseInt(a.ass) - parseInt(b.ass))
      .map((p) => ({ e, p }))
  );

  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
      <div className="overflow-x-auto scroll-thin">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-900 text-white">
            <tr>
              <th className="px-3 py-2.5 text-left font-medium text-xs uppercase tracking-wide">#</th>
              <th className="px-3 py-2.5 text-left font-medium text-xs uppercase tracking-wide">Grupo</th>
              <th className="px-3 py-2.5 text-left font-medium text-xs uppercase tracking-wide">Cota</th>
              <th className="px-3 py-2.5 text-left font-medium text-xs uppercase tracking-wide">Contrato</th>
              <th className="px-3 py-2.5 text-left font-medium text-xs uppercase tracking-wide">Prazo</th>
              <th className="px-3 py-2.5 text-center font-medium text-xs uppercase tracking-wide">Parcelas</th>
              <th className="px-3 py-2.5 text-left font-medium text-xs uppercase tracking-wide">Vencto</th>
              <th className="px-3 py-2.5 text-left font-medium text-xs uppercase tracking-wide">Pagto</th>
              <th className="px-3 py-2.5 text-right font-medium text-xs uppercase tracking-wide">Vl. Crédito</th>
              <th className="px-3 py-2.5 text-right font-medium text-xs uppercase tracking-wide">Vl. Devido</th>
              <th className="px-3 py-2.5 text-right font-medium text-xs uppercase tracking-wide">Vl. Pago</th>
              <th className="px-3 py-2.5 text-right font-medium text-xs uppercase tracking-wide">% Pago</th>
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between">
        <span>
          {rows.length} parcela{rows.length === 1 ? "" : "s"} de {extracts.length}{" "}
          cota{extracts.length === 1 ? "" : "s"}
        </span>
      </div>
    </div>
  );
}
