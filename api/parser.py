"""PDF parser for HS Administradora consorcio extracts.

Extracts from HS Administradora consorcio statements:
  - Header: Grupo, Cota, Nome, Contrato
  - Dados do Plano: Taxa Adm, Fundo Reserva, % Mensal Fundo Comum, % Mensal c/ Taxas
  - Conta Corrente rows (one per installment paid)
  - Valores / Percentuais Pagos and a Pagar
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

QTDE_TOTAL_RE = re.compile(r"Qtde Total:\s*(\d+)")
PRAZO_RE = re.compile(r"Prazo do grupo:\s*(\d+)\s*meses")

VALORES_SIDE_BY_SIDE = [
    ("Fundo Comum", "Fundo Comum", "fundo_comum"),
    ("Fundo de Reserva", "Fundo de Reserva", "fundo_reserva"),
    ("Taxa de Administração", "Taxa de Administração", "taxa_administracao"),
    ("Adesão(-)", "Adesão", "adesao"),
    ("Seguros", "Seguros", "seguros"),
    ("Multas", "Multas", "multas"),
    ("Juros", "Juros", "juros"),
    ("Outros Valores", "Outros Valores", "outros_valores"),
]

NUM_TOKEN = r"-?\d[\d.]*,\d+"


def _to_float(s: str) -> float:
    return float(s.replace(".", "").replace(",", "."))


def _to_float_or_zero(s: str | None) -> float:
    if not s:
        return 0.0
    try:
        return _to_float(s)
    except ValueError:
        return 0.0


def _pct_from_amount(amount: float, credito: float) -> float:
    if not credito:
        return 0.0
    return (amount / credito) * 100


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
class DadosPlano:
    taxa_administracao: float = 0.0
    fundo_reserva: float = 0.0
    pct_mensal_fundo_comum: float = 0.0
    pct_mensal_com_taxas: float = 0.0


@dataclass
class ValoresPagos:
    fundo_comum: float = 0.0
    fundo_comum_pct: float = 0.0
    fundo_reserva: float = 0.0
    fundo_reserva_pct: float = 0.0
    taxa_administracao: float = 0.0
    taxa_administracao_pct: float = 0.0
    adesao: float = 0.0
    adesao_pct: float = 0.0
    seguros: float = 0.0
    seguros_pct: float = 0.0
    multas: float = 0.0
    multas_pct: float = 0.0
    juros: float = 0.0
    juros_pct: float = 0.0
    outros_valores: float = 0.0
    outros_valores_pct: float = 0.0
    diferenca_parcela: float = 0.0
    diferenca_parcela_pct: float = 0.0
    total: float = 0.0
    total_pct: float = 0.0


@dataclass
class ValoresAPagar:
    fundo_comum: float = 0.0
    fundo_comum_pct: float = 0.0
    fundo_reserva: float = 0.0
    fundo_reserva_pct: float = 0.0
    taxa_administracao: float = 0.0
    taxa_administracao_pct: float = 0.0
    adesao: float = 0.0
    adesao_pct: float = 0.0
    seguros: float = 0.0
    seguros_pct: float = 0.0
    multas: float = 0.0
    multas_pct: float = 0.0
    juros: float = 0.0
    juros_pct: float = 0.0
    outros_valores: float = 0.0
    outros_valores_pct: float = 0.0
    total: float = 0.0
    total_pct: float = 0.0


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
    dados_plano: DadosPlano = field(default_factory=DadosPlano)
    conta_corrente: list[ContaCorrenteRow] = field(default_factory=list)
    valores_pagos: ValoresPagos = field(default_factory=ValoresPagos)
    valores_a_pagar: ValoresAPagar = field(default_factory=ValoresAPagar)

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


def _extract_block(text: str, start_marker: str, end_marker: str | None = None) -> str:
    start = text.find(start_marker)
    if start == -1:
        return ""
    end = text.find(end_marker, start) if end_marker else -1
    return text[start : end if end != -1 else len(text)]


def _extract_plano_value(block: str, label: str) -> float:
    m = re.search(rf"{re.escape(label)}:\s*(?P<value>{NUM_TOKEN})", block)
    return _to_float_or_zero(m.group("value") if m else None)


def _extract_dados_plano(text: str) -> DadosPlano:
    block = _extract_block(text, "Dados do Plano", "Conta Corrente")
    return DadosPlano(
        taxa_administracao=_extract_plano_value(block, "Taxa Adm"),
        fundo_reserva=_extract_plano_value(block, "Fundo Reserva"),
        pct_mensal_fundo_comum=_extract_plano_value(block, "% Mensal do Fundo Comum"),
        pct_mensal_com_taxas=_extract_plano_value(block, "% Mensal c/ Taxas"),
    )


def _set_valor_percentual(obj: ValoresPagos | ValoresAPagar, key: str, value: float, pct: float) -> None:
    setattr(obj, key, value)
    setattr(obj, f"{key}_pct", pct)


def _parse_valores_percentuais(text: str, credito: float) -> tuple[ValoresPagos, ValoresAPagar]:
    pagos = ValoresPagos()
    a_pagar = ValoresAPagar()
    block = _extract_block(text, "Valores / Percentuais Pagos", "Resumo Parcelas a Pagar")

    for line in block.splitlines():
        clean = line.strip()
        if not clean:
            continue

        for paid_label, payable_label, key in VALORES_SIDE_BY_SIDE:
            pattern = re.compile(
                rf"^{re.escape(paid_label)}:\s+"
                rf"(?P<paid_value>{NUM_TOKEN})"
                rf"(?:\s+(?P<paid_pct>{NUM_TOKEN}))?\s+"
                rf"{re.escape(payable_label)}:\s+"
                rf"(?P<payable_value>{NUM_TOKEN})"
                rf"(?:\s+(?P<payable_pct>{NUM_TOKEN}))?"
            )
            if m := pattern.match(clean):
                paid_value = _to_float_or_zero(m.group("paid_value"))
                paid_pct = (
                    _to_float_or_zero(m.group("paid_pct"))
                    if m.group("paid_pct") is not None
                    else _pct_from_amount(paid_value, credito)
                )
                payable_value = _to_float_or_zero(m.group("payable_value"))
                payable_pct = (
                    _to_float_or_zero(m.group("payable_pct"))
                    if m.group("payable_pct") is not None
                    else _pct_from_amount(payable_value, credito)
                )
                _set_valor_percentual(pagos, key, paid_value, paid_pct)
                _set_valor_percentual(a_pagar, key, payable_value, payable_pct)
                break
        else:
            if m := re.match(
                rf"^Diferença de Parcela:\s+(?P<value>{NUM_TOKEN})(?:\s+(?P<pct>{NUM_TOKEN}))?",
                clean,
            ):
                value = _to_float_or_zero(m.group("value"))
                pct = (
                    _to_float_or_zero(m.group("pct"))
                    if m.group("pct") is not None
                    else _pct_from_amount(value, credito)
                )
                _set_valor_percentual(pagos, "diferenca_parcela", value, pct)
            elif m := re.match(
                rf"^TOTAL\s+(?P<paid_value>{NUM_TOKEN})\s+(?P<paid_pct>{NUM_TOKEN})\s+"
                rf"TOTAL\s+(?P<payable_value>{NUM_TOKEN})\s+(?P<payable_pct>{NUM_TOKEN})",
                clean,
            ):
                _set_valor_percentual(
                    pagos,
                    "total",
                    _to_float_or_zero(m.group("paid_value")),
                    _to_float_or_zero(m.group("paid_pct")),
                )
                _set_valor_percentual(
                    a_pagar,
                    "total",
                    _to_float_or_zero(m.group("payable_value")),
                    _to_float_or_zero(m.group("payable_pct")),
                )

    return pagos, a_pagar


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

    if m := VALOR_CREDITO_RE.search(text):
        try:
            result.contrato_valor_credito = _to_float(m.group(1))
        except ValueError:
            pass

    result.dados_plano = _extract_dados_plano(text)

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

    # Valores / Percentuais Pagos and a Pagar
    result.valores_pagos, result.valores_a_pagar = _parse_valores_percentuais(
        text,
        result.contrato_valor_credito,
    )

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
