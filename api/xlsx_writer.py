"""Generate consolidated XLSX — one row per parcela (mirrors the web preview table).

Supports optional column filtering via the `columns` parameter.
"""
from __future__ import annotations

from datetime import datetime
from io import BytesIO
from typing import Iterable

from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter

from parser import ExtractResult


MONEY_FMT = "#,##0.00"
PCT_FMT = "0.0000"

TITLE_FONT = Font(bold=True, size=14, color="1E3A8A")
HEADER_FONT = Font(bold=True, color="FFFFFF", size=10)
HEADER_FILL = PatternFill("solid", fgColor="334155")
SECTION_FONT = Font(bold=True, color="111827", size=11)
SECTION_FILLS = {
    "DADOS DO CONTRATO": PatternFill("solid", fgColor="D9E2F3"),
    "DADOS DO PLANO": PatternFill("solid", fgColor="E2F0D9"),
    "CONTA CORRENTE": PatternFill("solid", fgColor="FCE4D6"),
    "VALORES PAGOS": PatternFill("solid", fgColor="E4DFEC"),
    "VALORES A PAGAR": PatternFill("solid", fgColor="FFF2CC"),
}
TOTAL_FONT = Font(bold=True)
TOTAL_FILL = PatternFill("solid", fgColor="E0E7FF")
CENTER = Alignment(horizontal="center", vertical="center")
LEFT = Alignment(horizontal="left", vertical="center")
RIGHT = Alignment(horizontal="right", vertical="center")
THIN = Side(style="thin", color="CBD5E1")
BOX = Border(top=THIN, bottom=THIN, left=THIN, right=THIN)
TOP_BORDER = Border(top=Side(style="medium", color="334155"))

# (key, section, header_label, width, kind)
ALL_COLUMNS = [
    ("num", "DADOS DO CONTRATO", "#", 6, "text"),
    ("grupo", "DADOS DO CONTRATO", "Grupo", 10, "text"),
    ("cota", "DADOS DO CONTRATO", "Cota", 12, "text"),
    ("nome", "DADOS DO CONTRATO", "Nome", 26, "text"),
    ("contrato", "DADOS DO CONTRATO", "Contrato", 16, "text"),
    ("emissao", "DADOS DO CONTRATO", "Emissão", 14, "date"),
    ("prazo", "DADOS DO CONTRATO", "Prazo", 10, "text"),
    ("parcelas", "DADOS DO CONTRATO", "Parcelas", 10, "text"),
    ("plano_taxa_adm", "DADOS DO PLANO", "Taxa Adm (%)", 14, "pct"),
    ("plano_fundo_reserva", "DADOS DO PLANO", "Fundo Reserva (%)", 18, "pct"),
    ("plano_pct_mensal_fundo_comum", "DADOS DO PLANO", "% Mensal Fundo Comum", 22, "pct"),
    ("plano_pct_mensal_com_taxas", "DADOS DO PLANO", "% Mensal c/ Taxas", 20, "pct"),
    ("vencto", "CONTA CORRENTE", "Vencto", 14, "date"),
    ("pagto", "CONTA CORRENTE", "Pagto", 14, "date"),
    ("vl_credito", "CONTA CORRENTE", "Vl. Crédito", 16, "money"),
    ("vl_devido", "CONTA CORRENTE", "Vl. Devido", 14, "money"),
    ("vl_pago", "CONTA CORRENTE", "Vl. Pago", 14, "money"),
    ("multa", "CONTA CORRENTE", "Multa", 12, "money"),
    ("juros", "CONTA CORRENTE", "Juros", 12, "money"),
    ("seguro", "CONTA CORRENTE", "Seguro", 12, "money"),
    ("pct_pago", "CONTA CORRENTE", "% Pago", 10, "pct"),
    ("pct_difer", "CONTA CORRENTE", "% Difer", 10, "pct"),
    ("quota_consorcio", "VALORES PAGOS", "Fundo Comum", 16, "money"),
    ("quota_consorcio_pct", "VALORES PAGOS", "% Fundo Comum", 16, "pct"),
    ("fundo_reserva", "VALORES PAGOS", "Fundo Reserva", 16, "money"),
    ("fundo_reserva_pct", "VALORES PAGOS", "% Fundo Reserva", 16, "pct"),
    ("taxa_adm", "VALORES PAGOS", "Taxa ADM", 16, "money"),
    ("taxa_adm_pct", "VALORES PAGOS", "% Taxa ADM", 14, "pct"),
    ("adesao_pago", "VALORES PAGOS", "Adesão", 14, "money"),
    ("adesao_pago_pct", "VALORES PAGOS", "% Adesão", 12, "pct"),
    ("seguros_pagos", "VALORES PAGOS", "Seguros", 14, "money"),
    ("seguros_pagos_pct", "VALORES PAGOS", "% Seguros", 12, "pct"),
    ("multas_pagas", "VALORES PAGOS", "Multas", 14, "money"),
    ("multas_pagas_pct", "VALORES PAGOS", "% Multas", 12, "pct"),
    ("juros_pagos", "VALORES PAGOS", "Juros", 14, "money"),
    ("juros_pagos_pct", "VALORES PAGOS", "% Juros", 12, "pct"),
    ("outros_valores_pagos", "VALORES PAGOS", "Outros Valores", 16, "money"),
    ("outros_valores_pagos_pct", "VALORES PAGOS", "% Outros Valores", 18, "pct"),
    ("diferenca_parcela_paga", "VALORES PAGOS", "Diferença Parcela", 18, "money"),
    ("diferenca_parcela_paga_pct", "VALORES PAGOS", "% Diferença Parcela", 20, "pct"),
    ("total_pago_valores", "VALORES PAGOS", "Total", 14, "money"),
    ("total_pago_valores_pct", "VALORES PAGOS", "% Total", 12, "pct"),
    ("pagar_fundo_comum", "VALORES A PAGAR", "Fundo Comum", 16, "money"),
    ("pagar_fundo_comum_pct", "VALORES A PAGAR", "% Fundo Comum", 16, "pct"),
    ("pagar_fundo_reserva", "VALORES A PAGAR", "Fundo Reserva", 16, "money"),
    ("pagar_fundo_reserva_pct", "VALORES A PAGAR", "% Fundo Reserva", 16, "pct"),
    ("pagar_taxa_adm", "VALORES A PAGAR", "Taxa ADM", 16, "money"),
    ("pagar_taxa_adm_pct", "VALORES A PAGAR", "% Taxa ADM", 14, "pct"),
    ("pagar_adesao", "VALORES A PAGAR", "Adesão", 14, "money"),
    ("pagar_adesao_pct", "VALORES A PAGAR", "% Adesão", 12, "pct"),
    ("pagar_seguros", "VALORES A PAGAR", "Seguros", 14, "money"),
    ("pagar_seguros_pct", "VALORES A PAGAR", "% Seguros", 12, "pct"),
    ("pagar_multas", "VALORES A PAGAR", "Multas", 14, "money"),
    ("pagar_multas_pct", "VALORES A PAGAR", "% Multas", 12, "pct"),
    ("pagar_juros", "VALORES A PAGAR", "Juros", 14, "money"),
    ("pagar_juros_pct", "VALORES A PAGAR", "% Juros", 12, "pct"),
    ("pagar_outros_valores", "VALORES A PAGAR", "Outros Valores", 16, "money"),
    ("pagar_outros_valores_pct", "VALORES A PAGAR", "% Outros Valores", 18, "pct"),
    ("total_a_pagar", "VALORES A PAGAR", "Total", 14, "money"),
    ("total_a_pagar_pct", "VALORES A PAGAR", "% Total", 12, "pct"),
]


def _money(cell, value):
    cell.value = value
    cell.number_format = MONEY_FMT
    cell.alignment = RIGHT


def _date(cell, value: str):
    try:
        cell.value = datetime.strptime(value, "%d/%m/%Y")
        cell.number_format = "DD/MM/YYYY"
    except (ValueError, TypeError):
        cell.value = value
    cell.alignment = CENTER


def _pct(cell, value):
    cell.value = value
    cell.number_format = PCT_FMT
    cell.alignment = RIGHT


def _plain(cell, value):
    cell.value = value
    cell.alignment = CENTER


def _column_value(key: str, r: ExtractResult, p, idx: int):
    valores = r.valores_pagos
    pagar = r.valores_a_pagar
    plano = r.dados_plano
    values = {
        "num": idx + 1,
        "grupo": r.grupo.lstrip("0") or "0",
        "cota": r.cota,
        "nome": r.nome,
        "contrato": r.contrato,
        "emissao": r.data_emissao,
        "prazo": f"{str(r.qtde_parcelas_pagas).zfill(3)}/{r.prazo_total}",
        "parcelas": p.ass,
        "plano_taxa_adm": plano.taxa_administracao,
        "plano_fundo_reserva": plano.fundo_reserva,
        "plano_pct_mensal_fundo_comum": plano.pct_mensal_fundo_comum,
        "plano_pct_mensal_com_taxas": plano.pct_mensal_com_taxas,
        "vencto": p.vencto,
        "pagto": p.pagto,
        "vl_credito": p.vl_cred,
        "vl_devido": p.vl_devido,
        "vl_pago": p.vl_pago,
        "multa": p.multa,
        "juros": p.juros,
        "seguro": p.seguro,
        "pct_pago": p.pct_pago,
        "pct_difer": p.pct_difer,
        "quota_consorcio": valores.fundo_comum,
        "quota_consorcio_pct": valores.fundo_comum_pct,
        "fundo_reserva": valores.fundo_reserva,
        "fundo_reserva_pct": valores.fundo_reserva_pct,
        "taxa_adm": valores.taxa_administracao,
        "taxa_adm_pct": valores.taxa_administracao_pct,
        "adesao_pago": valores.adesao,
        "adesao_pago_pct": valores.adesao_pct,
        "seguros_pagos": valores.seguros,
        "seguros_pagos_pct": valores.seguros_pct,
        "multas_pagas": valores.multas,
        "multas_pagas_pct": valores.multas_pct,
        "juros_pagos": valores.juros,
        "juros_pagos_pct": valores.juros_pct,
        "outros_valores_pagos": valores.outros_valores,
        "outros_valores_pagos_pct": valores.outros_valores_pct,
        "diferenca_parcela_paga": valores.diferenca_parcela,
        "diferenca_parcela_paga_pct": valores.diferenca_parcela_pct,
        "total_pago_valores": valores.total,
        "total_pago_valores_pct": valores.total_pct,
        "pagar_fundo_comum": pagar.fundo_comum,
        "pagar_fundo_comum_pct": pagar.fundo_comum_pct,
        "pagar_fundo_reserva": pagar.fundo_reserva,
        "pagar_fundo_reserva_pct": pagar.fundo_reserva_pct,
        "pagar_taxa_adm": pagar.taxa_administracao,
        "pagar_taxa_adm_pct": pagar.taxa_administracao_pct,
        "pagar_adesao": pagar.adesao,
        "pagar_adesao_pct": pagar.adesao_pct,
        "pagar_seguros": pagar.seguros,
        "pagar_seguros_pct": pagar.seguros_pct,
        "pagar_multas": pagar.multas,
        "pagar_multas_pct": pagar.multas_pct,
        "pagar_juros": pagar.juros,
        "pagar_juros_pct": pagar.juros_pct,
        "pagar_outros_valores": pagar.outros_valores,
        "pagar_outros_valores_pct": pagar.outros_valores_pct,
        "total_a_pagar": pagar.total,
        "total_a_pagar_pct": pagar.total_pct,
    }
    return values.get(key, "")


def _write_cell(cell, value, kind: str):
    if kind == "money":
        _money(cell, value)
    elif kind == "date":
        _date(cell, value)
    elif kind == "pct":
        _pct(cell, value)
    else:
        _plain(cell, value)


def _write_section_headers(ws, active):
    if not active:
        return
    start_col = 1
    current_section = active[0][1]
    for idx, column in enumerate(active, 1):
        section = column[1]
        next_section = active[idx][1] if idx < len(active) else None
        if section != next_section:
            end_col = idx
            if start_col < end_col:
                ws.merge_cells(start_row=1, start_column=start_col, end_row=1, end_column=end_col)
            cell = ws.cell(row=1, column=start_col, value=current_section)
            cell.font = SECTION_FONT
            cell.fill = SECTION_FILLS.get(current_section, HEADER_FILL)
            cell.alignment = LEFT
            for col in range(start_col, end_col + 1):
                section_cell = ws.cell(row=1, column=col)
                section_cell.fill = SECTION_FILLS.get(current_section, HEADER_FILL)
                section_cell.border = BOX
            start_col = idx + 1
            current_section = next_section


def build_xlsx(
    results: Iterable[ExtractResult],
    sheet_name: str = "Extratos",
    columns: list[str] | None = None,
) -> bytes:
    wb = Workbook()
    ws = wb.active
    ws.title = sheet_name[:31]

    results = list(results)

    # Determine active columns
    if columns:
        active = [c for c in ALL_COLUMNS if c[0] in columns]
    else:
        active = list(ALL_COLUMNS)

    keys = [c[0] for c in active]

    def col_of(key: str) -> int | None:
        try:
            return keys.index(key) + 1
        except ValueError:
            return None

    # Column widths
    for i, (_, _, _, w, _) in enumerate(active, 1):
        ws.column_dimensions[get_column_letter(i)].width = w

    # Flatten: one row per parcela
    rows_data = []
    for r in results:
        parcelas = sorted(r.conta_corrente, key=lambda p: int(p.ass))
        for p in parcelas:
            rows_data.append((r, p))

    n = len(rows_data)
    first_data = 3
    last_data = first_data + n - 1

    # Section row
    _write_section_headers(ws, active)

    # Header row
    hdr_row = 2
    for i, (_, _, label, _, _) in enumerate(active, 1):
        c = ws.cell(row=hdr_row, column=i, value=label)
        c.font = HEADER_FONT
        c.fill = HEADER_FILL
        c.alignment = CENTER
        c.border = BOX

    # Data rows
    for idx, (r, p) in enumerate(rows_data):
        row = first_data + idx
        for ci_idx, (key, _, _, _, kind) in enumerate(active):
            col = ci_idx + 1
            _write_cell(ws.cell(row=row, column=col), _column_value(key, r, p, idx), kind)
            ws.cell(row=row, column=col).border = BOX

    # Totals row
    sum_keys = {"vl_devido", "vl_pago", "multa", "juros", "seguro"}
    if n:
        trow = last_data + 1
        for ci_idx, key in enumerate(keys):
            col = ci_idx + 1
            cell = ws.cell(row=trow, column=col)
            if key in sum_keys:
                letter = get_column_letter(col)
                cell.value = f"=SUM({letter}{first_data}:{letter}{last_data})"
                cell.number_format = MONEY_FMT
                cell.alignment = RIGHT
            cell.fill = TOTAL_FILL
            cell.font = TOTAL_FONT
            cell.border = TOP_BORDER

        # Label "TOTAL"
        label_col = col_of("prazo") or col_of("contrato") or col_of("cota") or 1
        ws.cell(row=trow, column=label_col, value="TOTAL").font = TOTAL_FONT

    if active:
        ws.auto_filter.ref = f"A{hdr_row}:{get_column_letter(len(active))}{last_data if n else hdr_row}"
    ws.freeze_panes = f"A{first_data}"

    buf = BytesIO()
    wb.save(buf)
    return buf.getvalue()
