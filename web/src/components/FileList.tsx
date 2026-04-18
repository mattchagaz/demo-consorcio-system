"use client";

import { FileText, X } from "lucide-react";
import { formatBytes } from "@/lib/utils";

type Props = {
  files: File[];
  onRemove: (i: number) => void;
  onClear: () => void;
  disabled?: boolean;
};

export function FileList({ files, onRemove, onClear, disabled }: Props) {
  if (!files.length) return null;

  return (
    <section className="animate-fade-in-up">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-slate-700">
          {files.length} {files.length === 1 ? "arquivo" : "arquivos"} selecionado
          {files.length === 1 ? "" : "s"}
        </h2>
        <button
          onClick={onClear}
          disabled={disabled}
          className="text-xs text-slate-500 hover:text-red-600 disabled:opacity-40 transition"
        >
          Limpar tudo
        </button>
      </div>
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {files.map((f, i) => (
          <li
            key={`${f.name}-${i}`}
            className="group flex items-center gap-3 bg-white rounded-xl border border-slate-200 px-3 py-2.5 hover:border-indigo-300 hover:shadow-sm transition"
          >
            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center shrink-0 border border-red-100">
              <FileText className="h-4 w-4 text-red-500" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-800 truncate">
                {f.name}
              </p>
              <p className="text-xs text-slate-500">{formatBytes(f.size)}</p>
            </div>
            <button
              disabled={disabled}
              onClick={() => onRemove(i)}
              className="p-1.5 rounded-full opacity-0 group-hover:opacity-100 hover:bg-red-50 text-slate-400 hover:text-red-500 disabled:opacity-40 transition"
              aria-label="Remover"
            >
              <X className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
