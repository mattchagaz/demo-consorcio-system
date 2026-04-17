"""FastAPI service: POST PDFs -> JSON preview or XLSX download."""
from __future__ import annotations

import tempfile
from datetime import datetime
from pathlib import Path

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response

from parser import parse_pdf, ExtractResult
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
            except Exception as e:
                raise HTTPException(422, f"Failed to parse {f.filename}: {e}")
    results.sort(key=lambda r: (r.grupo, r.cota))
    return results


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
