"""PDF parser for HS Administradora consorcio extracts.

Extracts (from "Conta Corrente" section onwards, ignoring Dados Cadastrais/Plano):
  - Header: Grupo, Cota, Nome, Contrato
  - Conta Corrente rows (one per installment paid)
  - Valores / Percentuais Pagos: Fundo Comum, Fundo de Reserva, Taxa de Administração
  - Qtde parcelas pagas (Resumo Parcelas Pagas)
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field, asdict
from typing import Any

import pdfplumber


HEADER_RE = re.compile(
    r"Grupo:\s*(?P<grupo>\d+)\s+Cota:\s*(?P<cota>[\d-]+)\s+(?P<nome>.+?)\s+Contrato:\s*(?P<contrato>\d+)"
)

EMISSAO_RE = re.compile(r"^(\d{2}/\d{2}/\d{4})\s+\d{2}:\d{2}:\d{2}", re.MULTILINE)

VALOR_CREDITO_RE = re.compile(r"Valor Crédito:\s*([\d.,]+)")

DATE_RE = re.compile(r"\d{2}/\d{2}/\d{4}")
NUM_RE = re.compile(r"-?\d[\d.,]*")

CC_ROW_RE = re.compile(
    r"^(?P<ass>\d{3})\s+"
    r"(?P<aviso>\d+)\s+"
    r"(?P<parcela>[\d-]+)\s+"
    r"(?P<historico>[A-ZÀ-Ú.\s]+?)\s+"
    r"(?P<vencto>\d{2}/\d{2}/\d{4})\s+"
    r"(?P<pagto>\d{2}/\d{2}/\d{4})\s+"
    r"(?P<bem>\d+)\s+"
    r"(?P<vl_cred>[\d.,]+)\s+"
    r"(?P<vl_devido>[\d.,]+)\s+"
    r"(?P<vl_pago>[\d.,]+)\s+"
    r"(?P<multa>[\d.,]+)\s+"
    r"(?P<juros>[\d.,]+)\s+"
    r"(?P<seguro>[\d.,]+)\s+"
    r"(?P<pct_pago>[\d.,]+)\s+"
    r"(?P<pct_difer>[\d.,]+)\s*$"
)

# "Fundo Comum: 1.446,76 0,5668 Fundo Comum: 263.009,09 99,4274"
VALOR_PAGO_LINE_RE = lambda label: re.compile(
    rf"{re.escape(label)}:\s+(?P<pago>[\d.,]+)\s+[\d.,]+\s+.+?:\s+[\d.,]+"
)

QTDE_TOTAL_RE = re.compile(r"Qtde Total:\s*(\d+)")
PRAZO_RE = re.compile(r"Prazo do grupo:\s*(\d+)\s*meses")


def _to_float(s: str) -> float:
    return float(s.replace(".", "").replace(",", "."))


@dataclass
class ContaCorrenteRow:
    ass: str
    aviso: str
    historico: str
    vencto: str
    pagto: str
    bem: str
    vl_cred: float
    vl_devido: float
    vl_pago: float
    multa: float
    juros: float
    seguro: float
    pct_pago: float
    pct_difer: float


@dataclass
class ValoresPagos:
    fundo_comum: float = 0.0
    fundo_reserva: float = 0.0
    taxa_administracao: float = 0.0

    @property
    def total(self) -> float:
        return self.fundo_comum + self.fundo_reserva + self.taxa_administracao


@dataclass
class ExtractResult:
    data_emissao: str = ""
    grupo: str = ""
    cota: str = ""
    nome: str = ""
    contrato: str = ""
    contrato_valor_credito: float = 0.0
    lance_embutido: float = 0.0
    prazo_total: int = 0
    qtde_parcelas_pagas: int = 0
    conta_corrente: list[ContaCorrenteRow] = field(default_factory=list)
    valores_pagos: ValoresPagos = field(default_factory=ValoresPagos)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)

    @property
    def parcela_atual(self) -> ContaCorrenteRow | None:
        if not self.conta_corrente:
            return None
        return max(self.conta_corrente, key=lambda r: int(r.ass))

    @property
    def valor_parcela(self) -> float:
        """Monthly installment — taken from the most recent paid parcela."""
        p = self.parcela_atual
        return p.vl_pago if p else 0.0


class InvalidPDFError(Exception):
    """Raised when a PDF does not match the expected HS Administradora layout."""


def _validate_hs_layout(text: str, filename: str = "") -> None:
    """Check that the extracted text contains the key markers of an HS extract."""
    required = [
        ("HS ADMINISTRADORA", "cabeçalho da HS Administradora"),
        ("Extrato do Consorciado", "título 'Extrato do Consorciado'"),
        ("Conta Corrente", "seção 'Conta Corrente'"),
    ]
    missing = [desc for marker, desc in required if marker not in text]
    if missing:
        label = f"'{filename}': " if filename else ""
        raise InvalidPDFError(
            f"{label}Este PDF não é um extrato válido da HS Administradora. "
            f"Não encontrado: {', '.join(missing)}."
        )


def parse_pdf(path: str) -> ExtractResult:
    with pdfplumber.open(path) as pdf:
        text = "\n".join(page.extract_text() or "" for page in pdf.pages)
    _validate_hs_layout(text, filename=path.rsplit("/", 1)[-1])
    return parse_text(text)


def _extract_valor_pago(text: str, label: str) -> float:
    """Extract the 'Pagos' column value (first number after label) in the
    'Valores / Percentuais Pagos' section."""
    pagos_idx = text.find("Valores / Percentuais Pagos")
    if pagos_idx == -1:
        return 0.0
    # search only within the block
    block = text[pagos_idx : pagos_idx + 1500]
    m = VALOR_PAGO_LINE_RE(label).search(block)
    if not m:
        return 0.0
    try:
        return _to_float(m.group("pago"))
    except (ValueError, IndexError):
        return 0.0


def parse_text(text: str) -> ExtractResult:
    result = ExtractResult()

    if m := EMISSAO_RE.search(text):
        result.data_emissao = m.group(1)

    if m := HEADER_RE.search(text):
        result.grupo = m.group("grupo")
        result.cota = m.group("cota")
        result.nome = m.group("nome").strip()
        result.contrato = m.group("contrato")

    if m := PRAZO_RE.search(text):
        result.prazo_total = int(m.group(1))

    # Conta Corrente rows
    cc_start = text.find("Conta Corrente")
    if cc_start != -1:
        pend_idx = text.find("Pend", cc_start)
        cc_block = text[cc_start : pend_idx if pend_idx != -1 else len(text)]
        for line in cc_block.splitlines():
            if m := CC_ROW_RE.match(line.strip()):
                result.conta_corrente.append(
                    ContaCorrenteRow(
                        ass=m.group("ass"),
                        aviso=m.group("aviso"),
                        historico=m.group("historico").strip(),
                        vencto=m.group("vencto"),
                        pagto=m.group("pagto"),
                        bem=m.group("bem"),
                        vl_cred=_to_float(m.group("vl_cred")),
                        vl_devido=_to_float(m.group("vl_devido")),
                        vl_pago=_to_float(m.group("vl_pago")),
                        multa=_to_float(m.group("multa")),
                        juros=_to_float(m.group("juros")),
                        seguro=_to_float(m.group("seguro")),
                        pct_pago=_to_float(m.group("pct_pago")),
                        pct_difer=_to_float(m.group("pct_difer")),
                    )
                )

    result.qtde_parcelas_pagas = len(result.conta_corrente)
    pagas_idx = text.find("Resumo Parcelas Pagas")
    if pagas_idx != -1:
        tail = text[pagas_idx : pagas_idx + 500]
        if m := QTDE_TOTAL_RE.search(tail):
            try:
                result.qtde_parcelas_pagas = int(m.group(1))
            except ValueError:
                pass

    # Valores / Percentuais Pagos
    result.valores_pagos = ValoresPagos(
        fundo_comum=_extract_valor_pago(text, "Fundo Comum"),
        fundo_reserva=_extract_valor_pago(text, "Fundo de Reserva"),
        taxa_administracao=_extract_valor_pago(text, "Taxa de Administração"),
    )

    if m := VALOR_CREDITO_RE.search(text):
        try:
            result.contrato_valor_credito = _to_float(m.group(1))
        except ValueError:
            pass

    # Lance embutido — pdfplumber garbles the dates on these rows, so use a
    # position-based approach: anchor on the last clean date, then numbers after
    # are [bem, vl_cred, vl_devido, vl_pago, multa, juros, seguro, pct, pct].
    # Include RECBTO + EST.RECBTO so estornos cancel to zero; skip PAGTO BEM.
    if cc_start != -1:
        pend_idx = text.find("Pend", cc_start)
        cc_block = text[cc_start : pend_idx if pend_idx != -1 else len(text)]
        total_lance = 0.0
        for line in cc_block.splitlines():
            u = line.upper()
            if "LANCE EMBUT" not in u or "PAGTO" in u:
                continue
            dates = list(DATE_RE.finditer(line))
            if not dates:
                continue
            tail = line[dates[-1].end():]
            nums = NUM_RE.findall(tail)
            if len(nums) < 4:
                continue
            try:
                total_lance += _to_float(nums[3])  # vl_pago
            except ValueError:
                pass
        result.lance_embutido = total_lance

    return result
