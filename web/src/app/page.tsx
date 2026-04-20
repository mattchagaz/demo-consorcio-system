"use client";

import { useState, useRef } from "react";
import { Download, Loader2, Eye, Sparkles } from "lucide-react";
import { Header } from "@/components/Header";
import { Dropzone } from "@/components/Dropzone";
import { FileList } from "@/components/FileList";
import { StatsBar } from "@/components/StatsBar";
import { CotaCards } from "@/components/CotaCards";
import { PreviewTable, type Extract } from "@/components/PreviewTable";
import { ViewTabs, type View } from "@/components/ViewTabs";
import { ProgressBar } from "@/components/ProgressBar";
import { ColumnPicker, ALL_COLUMNS, type ColumnKey } from "@/components/ColumnPicker";
import { Toast } from "@/components/Toast";

const API = "/api";

export default function Home() {
  const [files, setFiles] = useState<File[]>([]);
  const [extracts, setExtracts] = useState<Extract[]>([]);
  const [loading, setLoading] = useState<"preview" | "export" | null>(null);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [toast, setToast] = useState<{ kind: "error" | "success"; message: string } | null>(null);
  const [view, setView] = useState<View>("cards");
  const [selectedColumns, setSelectedColumns] = useState<ColumnKey[]>(
    ALL_COLUMNS.map((c) => c.key)
  );
  const abortRef = useRef<AbortController | null>(null);

  const addFiles = (incoming: File[]) => {
    setFiles((prev) => {
      const seen = new Set(prev.map((f) => `${f.name}-${f.size}`));
      return [...prev, ...incoming.filter((f) => !seen.has(`${f.name}-${f.size}`))];
    });
    setExtracts([]);
  };

  const removeFile = (i: number) => {
    setFiles((prev) => prev.filter((_, idx) => idx !== i));
    setExtracts([]);
  };

  const clearAll = () => {
    setFiles([]);
    setExtracts([]);
  };

  const doPreview = async () => {
    setLoading("preview");
    setExtracts([]);
    setProgress({ current: 0, total: files.length });

    const results: Extract[] = [];
    const errors: string[] = [];
    abortRef.current = new AbortController();

    for (let i = 0; i < files.length; i++) {
      if (abortRef.current.signal.aborted) break;

      const fd = new FormData();
      fd.append("files", files[i]);

      try {
        const res = await fetch(`${API}/extract`, {
          method: "POST",
          body: fd,
          signal: abortRef.current.signal,
        });
        if (!res.ok) {
          const text = await res.text();
          errors.push(`${files[i].name}: ${text}`);
        } else {
          const data = await res.json();
          results.push(...data.extracts);
        }
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") break;
        errors.push(`${files[i].name}: ${e instanceof Error ? e.message : "Erro"}`);
      }

      setProgress({ current: i + 1, total: files.length });
    }

    results.sort((a, b) =>
      `${a.grupo}-${a.cota}`.localeCompare(`${b.grupo}-${b.cota}`)
    );
    setExtracts(results);

    if (errors.length > 0) {
      setToast({
        kind: "error",
        message: `${errors.length} erro(s): ${errors[0]}`,
      });
    } else if (results.length > 0) {
      setToast({
        kind: "success",
        message: `${results.length} cota(s) processada(s) com sucesso.`,
      });
    }

    setLoading(null);
    abortRef.current = null;
  };

  const doExport = async () => {
    setLoading("export");
    try {
      let res: Response;

      if (extracts.length > 0) {
        // Use cached results + column selection
        res = await fetch(`${API}/export-json`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            extracts: extracts,
            columns: selectedColumns,
          }),
        });
      } else {
        // Fallback: send files directly
        const fd = new FormData();
        files.forEach((f) => fd.append("files", f));
        res = await fetch(`${API}/export`, { method: "POST", body: fd });
      }

      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download =
        res.headers.get("content-disposition")?.match(/filename="([^"]+)"/)?.[1] ??
        "consorcio_extratos.xlsx";
      a.click();
      URL.revokeObjectURL(url);
      setToast({ kind: "success", message: "Planilha gerada com sucesso." });
    } catch (e) {
      setToast({ kind: "error", message: e instanceof Error ? e.message : "Erro ao exportar" });
    } finally {
      setLoading(null);
    }
  };

  const busy = loading !== null;
  const hasFiles = files.length > 0;
  const hasExtracts = extracts.length > 0;

  return (
    <div className="min-h-screen app-bg flex-1 flex flex-col relative">
      {/* decorative floating blobs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div className="absolute top-[-200px] left-[-150px] h-[500px] w-[500px] rounded-full bg-gradient-to-br from-indigo-300/30 to-purple-300/20 blur-3xl animate-float-slow" />
        <div className="absolute top-[40%] right-[-200px] h-[450px] w-[450px] rounded-full bg-gradient-to-br from-pink-200/30 to-orange-200/20 blur-3xl animate-float-slower" />
        <div className="absolute bottom-[-150px] left-[20%] h-[400px] w-[400px] rounded-full bg-gradient-to-br from-cyan-200/25 to-emerald-200/15 blur-3xl animate-float-slow" />
      </div>

      <Header />

      <main className="relative z-10 flex-1 w-full max-w-[90rem] mx-auto px-6 py-10 space-y-8">
        {!hasExtracts && (
          <section className="text-center max-w-2xl mx-auto pt-4 pb-2 animate-fade-in-up">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-xs font-medium text-indigo-700 mb-4">
              <Sparkles className="h-3 w-3" />
              PDF to XLSX
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
              Transforme extratos em{" "}
              <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                planilhas consolidadas e organizadas
              </span>
            </h2>
            <p className="mt-3 text-slate-600">
              Faça upload de vários PDFs e exporte tudo em um único arquivo Excel
            </p>
          </section>
        )}

        <section>
          {hasFiles ? (
            <Dropzone onFiles={addFiles} disabled={busy} compact />
          ) : (
            <Dropzone onFiles={addFiles} disabled={busy} />
          )}
        </section>

        {hasFiles && (
          <FileList
            files={files}
            onRemove={removeFile}
            onClear={clearAll}
            disabled={busy}
          />
        )}

        {loading === "preview" && progress.total > 1 && (
          <ProgressBar
            current={progress.current}
            total={progress.total}
            label="Processando PDFs"
          />
        )}

        {hasFiles && (
          <section className="flex flex-wrap items-center gap-3 animate-fade-in-up">
            <button
              onClick={doPreview}
              disabled={busy}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-800 text-sm font-medium hover:border-slate-400 hover:bg-slate-50 disabled:opacity-50 transition"
            >
              {loading === "preview" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
              Pré-visualizar
            </button>
            <button
              onClick={doExport}
              disabled={busy}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-sm font-medium shadow-lg shadow-indigo-600/20 disabled:opacity-50 transition"
            >
              {loading === "export" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Baixar Excel ({files.length})
            </button>
            <ColumnPicker selected={selectedColumns} onChange={setSelectedColumns} />
          </section>
        )}

        {hasExtracts && (
          <section className="space-y-6 animate-fade-in-up">
            <StatsBar extracts={extracts} />

            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Resultado</h3>
              <ViewTabs value={view} onChange={setView} />
            </div>

            {view === "cards" && <CotaCards extracts={extracts} />}
            {view === "table" && <PreviewTable extracts={extracts} />}
          </section>
        )}
      </main>

      <footer className="relative z-10 py-6 text-center text-xs text-slate-500">
        Consórcio PDF Extractor · Developed by <a href="https://www.linkedin.com/in/matheusferrazchagas/" target="_blank">mattchgz</a>
      </footer>

      {toast && (
        <Toast
          kind={toast.kind}
          message={toast.message}
          onDismiss={() => setToast(null)}
        />
      )}
    </div>
  );
}
