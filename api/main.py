"""FastAPI service: POST PDFs -> JSON preview or XLSX download."""
from __future__ import annotations

import tempfile
from datetime import datetime
from pathlib import Path

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel

from parser import parse_pdf, ExtractResult, InvalidPDFError, ValoresPagos, ContaCorrenteRow
from xlsx_writer import build_xlsx

app = FastAPI(title="Consorcio PDF Extractor", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


async def _parse_uploads(files: list[UploadFile]) -> list[ExtractResult]:
    results: list[ExtractResult] = []
    with tempfile.TemporaryDirectory() as tmp:
        tmpdir = Path(tmp)
        for f in files:
            if not f.filename or not f.filename.lower().endswith(".pdf"):
                raise HTTPException(400, f"Only PDFs supported: {f.filename}")
            dest = tmpdir / f.filename
            dest.write_bytes(await f.read())
            try:
                results.append(parse_pdf(str(dest)))
            except InvalidPDFError as e:
                raise HTTPException(400, str(e))
            except Exception as e:
                raise HTTPException(422, f"Falha ao processar {f.filename}: {e}")
    results.sort(key=lambda r: (r.grupo, r.cota))
    return results


def _dict_to_extract(d: dict) -> ExtractResult:
    """Reconstruct an ExtractResult from a JSON dict."""
    vp = d.get("valores_pagos", {})
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
        valores_pagos=ValoresPagos(
            fundo_comum=vp.get("fundo_comum", 0.0),
            fundo_reserva=vp.get("fundo_reserva", 0.0),
            taxa_administracao=vp.get("taxa_administracao", 0.0),
        ),
        conta_corrente=[
            ContaCorrenteRow(**row) for row in cc
        ],
    )


class ExportRequest(BaseModel):
    extracts: list[dict]
    columns: list[str] | None = None


@app.get("/health")
async def health():
    return {"ok": True}


@app.post("/extract")
async def extract(files: list[UploadFile] = File(...)):
    results = await _parse_uploads(files)
    return {
        "count": len(results),
        "extracts": [r.to_dict() for r in results],
    }


@app.post("/export")
async def export(files: list[UploadFile] = File(...)):
    results = await _parse_uploads(files)
    data = build_xlsx(results)
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
    results = [_dict_to_extract(d) for d in body.extracts]
    results.sort(key=lambda r: (r.grupo, r.cota))
    data = build_xlsx(results, columns=body.columns)
    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    fname = f"consorcio_extratos_{stamp}.xlsx"
    return Response(
        content=data,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{fname}"'},
    )
