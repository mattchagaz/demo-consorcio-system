"""FastAPI service: POST PDFs -> JSON preview or XLSX download."""
from __future__ import annotations

import tempfile
from datetime import datetime
from pathlib import Path, PurePosixPath

from fastapi import FastAPI, File, Form, Header, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel

from metrics_store import get_metrics_summary, init_metrics_store, record_conversion_job
from parser import (
    parse_pdf,
    DadosPlano,
    ExtractResult,
    InvalidPDFError,
    ValoresAPagar,
    ValoresPagos,
    ContaCorrenteRow,
)
from xlsx_writer import build_xlsx

app = FastAPI(title="Consorcio PDF Extractor", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup() -> None:
    init_metrics_store()


async def _parse_uploads(files: list[UploadFile]) -> list[ExtractResult]:
    results: list[ExtractResult] = []
    with tempfile.TemporaryDirectory() as tmp:
        tmpdir = Path(tmp)
        for f in files:
            filename = _upload_basename(f.filename)
            if not filename or not filename.lower().endswith(".pdf"):
                raise HTTPException(400, f"Only PDFs supported: {f.filename}")
            dest = tmpdir / filename
            try:
                dest.write_bytes(await f.read())
            except Exception as e:
                raise HTTPException(400, f"Falha ao receber {filename}: {e}")
            try:
                results.append(parse_pdf(str(dest)))
            except InvalidPDFError as e:
                raise HTTPException(400, str(e))
            except Exception as e:
                raise HTTPException(422, f"Falha ao processar {filename}: {e}")
    results.sort(key=lambda r: (r.grupo, r.cota))
    return results


def _upload_basename(filename: str | None) -> str:
    """Return a safe basename for uploads that may include a folder path."""
    if not filename:
        return ""
    normalized = filename.replace("\\", "/")
    return PurePosixPath(normalized).name


def _upload_filenames(files: list[UploadFile]) -> list[str]:
    return [_upload_basename(f.filename) for f in files]


def _error_text(exc: Exception) -> str:
    if isinstance(exc, HTTPException):
        return str(exc.detail)
    return str(exc)


def _record_metrics(**kwargs) -> None:
    try:
        record_conversion_job(**kwargs)
    except Exception:
        # Metrics must never block the PDF conversion workflow.
        pass


def _require_metrics_token(authorization: str | None) -> None:
    # Optional: set METRICS_TOKEN in production to protect the direct API endpoint.
    from os import getenv

    token = getenv("METRICS_TOKEN")
    if token and authorization != f"Bearer {token}":
        raise HTTPException(401, "Unauthorized")


def _dict_to_extract(d: dict) -> ExtractResult:
    """Reconstruct an ExtractResult from a JSON dict."""
    dp = d.get("dados_plano", {})
    vp = d.get("valores_pagos", {})
    vap = d.get("valores_a_pagar", {})
    cc = d.get("conta_corrente", [])
    return ExtractResult(
        data_emissao=d.get("data_emissao", ""),
        grupo=d.get("grupo", ""),
        cota=d.get("cota", ""),
        nome=d.get("nome", ""),
        contrato=d.get("contrato", ""),
        contrato_valor_credito=d.get("contrato_valor_credito", 0.0),
        lance_embutido=d.get("lance_embutido", 0.0),
        prazo_total=d.get("prazo_total", 0),
        qtde_parcelas_pagas=d.get("qtde_parcelas_pagas", 0),
        dados_plano=DadosPlano(
            taxa_administracao=dp.get("taxa_administracao", 0.0),
            fundo_reserva=dp.get("fundo_reserva", 0.0),
            pct_mensal_fundo_comum=dp.get("pct_mensal_fundo_comum", 0.0),
            pct_mensal_com_taxas=dp.get("pct_mensal_com_taxas", 0.0),
        ),
        valores_pagos=ValoresPagos(
            fundo_comum=vp.get("fundo_comum", 0.0),
            fundo_comum_pct=vp.get("fundo_comum_pct", 0.0),
            fundo_reserva=vp.get("fundo_reserva", 0.0),
            fundo_reserva_pct=vp.get("fundo_reserva_pct", 0.0),
            taxa_administracao=vp.get("taxa_administracao", 0.0),
            taxa_administracao_pct=vp.get("taxa_administracao_pct", 0.0),
            adesao=vp.get("adesao", 0.0),
            adesao_pct=vp.get("adesao_pct", 0.0),
            seguros=vp.get("seguros", 0.0),
            seguros_pct=vp.get("seguros_pct", 0.0),
            multas=vp.get("multas", 0.0),
            multas_pct=vp.get("multas_pct", 0.0),
            juros=vp.get("juros", 0.0),
            juros_pct=vp.get("juros_pct", 0.0),
            outros_valores=vp.get("outros_valores", 0.0),
            outros_valores_pct=vp.get("outros_valores_pct", 0.0),
            diferenca_parcela=vp.get("diferenca_parcela", 0.0),
            diferenca_parcela_pct=vp.get("diferenca_parcela_pct", 0.0),
            total=vp.get("total", 0.0),
            total_pct=vp.get("total_pct", 0.0),
        ),
        valores_a_pagar=ValoresAPagar(
            fundo_comum=vap.get("fundo_comum", 0.0),
            fundo_comum_pct=vap.get("fundo_comum_pct", 0.0),
            fundo_reserva=vap.get("fundo_reserva", 0.0),
            fundo_reserva_pct=vap.get("fundo_reserva_pct", 0.0),
            taxa_administracao=vap.get("taxa_administracao", 0.0),
            taxa_administracao_pct=vap.get("taxa_administracao_pct", 0.0),
            adesao=vap.get("adesao", 0.0),
            adesao_pct=vap.get("adesao_pct", 0.0),
            seguros=vap.get("seguros", 0.0),
            seguros_pct=vap.get("seguros_pct", 0.0),
            multas=vap.get("multas", 0.0),
            multas_pct=vap.get("multas_pct", 0.0),
            juros=vap.get("juros", 0.0),
            juros_pct=vap.get("juros_pct", 0.0),
            outros_valores=vap.get("outros_valores", 0.0),
            outros_valores_pct=vap.get("outros_valores_pct", 0.0),
            total=vap.get("total", 0.0),
            total_pct=vap.get("total_pct", 0.0),
        ),
        conta_corrente=[
            ContaCorrenteRow(**row) for row in cc
        ],
    )


class ExportRequest(BaseModel):
    extracts: list[dict]
    columns: list[str] | None = None
    user_email: str | None = None


@app.get("/health")
async def health():
    return {"ok": True}


@app.post("/extract")
async def extract(
    files: list[UploadFile] = File(...),
    user_email: str | None = Form(None),
):
    file_names = _upload_filenames(files)
    try:
        results = await _parse_uploads(files)
    except HTTPException as e:
        _record_metrics(
            action="preview",
            user_email=user_email,
            uploaded_count=len(files),
            parsed_count=0,
            failed_count=len(files),
            output_count=0,
            status="error",
            error_message=_error_text(e),
            file_names=file_names,
        )
        raise
    _record_metrics(
        action="preview",
        user_email=user_email,
        uploaded_count=len(files),
        parsed_count=len(results),
        failed_count=max(len(files) - len(results), 0),
        output_count=0,
        status="success",
        file_names=file_names,
    )
    return {
        "count": len(results),
        "extracts": [r.to_dict() for r in results],
    }


@app.post("/export")
async def export(
    files: list[UploadFile] = File(...),
    user_email: str | None = Form(None),
):
    file_names = _upload_filenames(files)
    try:
        results = await _parse_uploads(files)
        data = build_xlsx(results)
    except HTTPException as e:
        _record_metrics(
            action="export",
            user_email=user_email,
            uploaded_count=len(files),
            parsed_count=0,
            failed_count=len(files),
            output_count=0,
            status="error",
            error_message=_error_text(e),
            file_names=file_names,
        )
        raise
    except Exception as e:
        _record_metrics(
            action="export",
            user_email=user_email,
            uploaded_count=len(files),
            parsed_count=0,
            failed_count=len(files),
            output_count=0,
            status="error",
            error_message=_error_text(e),
            file_names=file_names,
        )
        raise HTTPException(500, f"Falha ao gerar Excel: {e}")
    _record_metrics(
        action="export",
        user_email=user_email,
        uploaded_count=len(files),
        parsed_count=len(results),
        failed_count=max(len(files) - len(results), 0),
        output_count=len(results),
        status="success",
        file_names=file_names,
    )
    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    fname = f"consorcio_extratos_{stamp}.xlsx"
    return Response(
        content=data,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{fname}"'},
    )


@app.post("/export-json")
async def export_json(body: ExportRequest):
    """Generate XLSX from already-parsed JSON data, with optional column filtering."""
    try:
        results = [_dict_to_extract(d) for d in body.extracts]
        results.sort(key=lambda r: (r.grupo, r.cota))
        data = build_xlsx(results, columns=body.columns)
    except Exception as e:
        _record_metrics(
            action="export_json",
            user_email=body.user_email,
            uploaded_count=0,
            parsed_count=0,
            failed_count=0,
            output_count=0,
            status="error",
            error_message=_error_text(e),
        )
        raise HTTPException(500, f"Falha ao gerar Excel: {e}")
    _record_metrics(
        action="export_json",
        user_email=body.user_email,
        uploaded_count=0,
        parsed_count=0,
        failed_count=0,
        output_count=len(results),
        status="success",
    )
    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    fname = f"consorcio_extratos_{stamp}.xlsx"
    return Response(
        content=data,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{fname}"'},
    )


@app.get("/metrics/summary")
async def metrics_summary(authorization: str | None = Header(None)):
    _require_metrics_token(authorization)
    return get_metrics_summary()
