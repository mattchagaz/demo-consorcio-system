"""Generate consolidated XLSX in "listão" format — one row per cota.

Layout:

    Row 1: title / totals
    Row 2: (blank)
    Row 3: column headers
    Row 4..N: one row per cota
    Row N+1: totals row

Columns:
    A  Mês                         (sequential index)
    B  Cota                        ("grupo-cota")
    C  Cota contemplada            (Valor Crédito do contrato)
    D  Cont. Lanc. Emb             (Lance Embutido líquido)
    E  Saldo Contemplação          (= C - D, fórmula)
    F  Soma                        (soma corrente de E, fórmula)
    G  Pagamentos                  (total pago = FC + FR + TxAdm)
    H  Saldo Crédito - Parcelas    (= E - soma corrente de G, fórmula)
"""
from __future__ import annotations

from io import BytesIO
from typing import Iterable

from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter

from parser import ExtractResult


MONEY_FMT = "#,##0.00"
COL_WIDTHS = [6, 10, 10, 18, 18, 20, 18, 18, 24]

TITLE_FONT = Font(bold=True, size=14, color="1E3A8A")
HEADER_FONT = Font(bold=True, color="FFFFFF", size=10)
HEADER_FILL = PatternFill("solid", fgColor="334155")
TOTAL_FONT = Font(bold=True)
TOTAL_FILL = PatternFill("solid", fgColor="E0E7FF")
CENTER = Alignment(horizontal="center", vertical="center")
LEFT = Alignment(horizontal="left", vertical="center")
RIGHT = Alignment(horizontal="right", vertical="center")
THIN = Side(style="thin", color="CBD5E1")
BOX = Border(top=THIN, bottom=THIN, left=THIN, right=THIN)
TOP_BORDER = Border(top=Side(style="medium", color="334155"))


HEADERS = [
    "Mês",
    "Grupo",
    "Cota",
    "Cota contemplada",
    "Cont. Lanc. Emb",
    "Saldo Contemplação",
    "Soma",
    "Pagamentos",
    "Saldo Crédito - Parcelas",
]


def _money(cell, value):
    cell.value = value
    cell.number_format = MONEY_FMT
    cell.alignment = RIGHT


def build_xlsx(results: Iterable[ExtractResult], sheet_name: str = "Listão") -> bytes:
    wb = Workbook()
    ws = wb.active
    ws.title = sheet_name[:31]

    for i, w in enumerate(COL_WIDTHS, 1):
        ws.column_dimensions[get_column_letter(i)].width = w

    results = list(results)
    n = len(results)

    # Title + totals
    c = ws.cell(row=1, column=1, value="Crédito Contratado")
    c.font = TITLE_FONT
    c.alignment = LEFT
    ws.merge_cells(start_row=1, start_column=1, end_row=1, end_column=3)

    first_data = 4
    last_data = first_data + n - 1

    if n:
        c = ws.cell(row=1, column=4, value=f"=SUM(D{first_data}:D{last_data})")
        c.font = TITLE_FONT
        c.number_format = MONEY_FMT
        c.alignment = RIGHT

        c = ws.cell(row=1, column=8, value="Total Pagamentos")
        c.font = TITLE_FONT
        c.alignment = RIGHT
        c = ws.cell(row=1, column=9, value=f"=SUM(H{first_data}:H{last_data})")
        c.font = TITLE_FONT
        c.number_format = MONEY_FMT
        c.alignment = RIGHT

    # Header row
    hdr_row = 3
    for i, label in enumerate(HEADERS, 1):
        c = ws.cell(row=hdr_row, column=i, value=label)
        c.font = HEADER_FONT
        c.fill = HEADER_FILL
        c.alignment = CENTER
        c.border = BOX

    # Data rows
    for idx, r in enumerate(results):
        row = first_data + idx
        ws.cell(row=row, column=1, value=idx + 1).alignment = CENTER
        ws.cell(row=row, column=2, value=r.grupo).alignment = CENTER
        ws.cell(row=row, column=3, value=r.cota).alignment = CENTER

        _money(ws.cell(row=row, column=4), r.contrato_valor_credito)
        _money(ws.cell(row=row, column=5), r.lance_embutido)
        _money(ws.cell(row=row, column=6), f"=D{row}-E{row}")
        _money(ws.cell(row=row, column=7), f"=SUM($F${first_data}:F{row})")
        _money(ws.cell(row=row, column=8), r.valores_pagos.total)
        _money(ws.cell(row=row, column=9), f"=F{row}-SUM($H${first_data}:H{row})")

    # Totals row
    if n:
        trow = last_data + 1
        c = ws.cell(row=trow, column=3, value="TOTAL")
        c.font = TOTAL_FONT
        c.alignment = RIGHT
        for col in (4, 5, 6, 8):
            letter = get_column_letter(col)
            cell = ws.cell(row=trow, column=col, value=f"=SUM({letter}{first_data}:{letter}{last_data})")
            cell.number_format = MONEY_FMT
            cell.font = TOTAL_FONT
            cell.alignment = RIGHT
            cell.fill = TOTAL_FILL
            cell.border = TOP_BORDER
        for col in (1, 2, 3, 7, 9):
            cell = ws.cell(row=trow, column=col)
            cell.fill = TOTAL_FILL
            cell.font = TOTAL_FONT
            cell.border = TOP_BORDER

    ws.freeze_panes = "A4"

    buf = BytesIO()
    wb.save(buf)
    return buf.getvalue()
