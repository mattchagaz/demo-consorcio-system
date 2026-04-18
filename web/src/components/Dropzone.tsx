"use client";

import { useDropzone } from "react-dropzone";
import { UploadCloud, FilePlus2, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  onFiles: (files: File[]) => void;
  disabled?: boolean;
  compact?: boolean;
};

export function Dropzone({ onFiles, disabled, compact }: Props) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { "application/pdf": [".pdf"] },
    multiple: true,
    disabled,
    onDrop: onFiles,
  });

  if (compact) {
    return (
      <div
        {...getRootProps()}
        className={cn(
          "flex items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-3 text-sm cursor-pointer transition",
          isDragActive
            ? "border-indigo-500 bg-indigo-50 text-indigo-700"
            : "border-slate-300 bg-white hover:border-indigo-400 hover:bg-indigo-50/50 text-slate-700",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <input {...getInputProps()} />
        <FilePlus2 className="h-4 w-4" />
        <span className="font-medium">Adicionar mais PDFs</span>
      </div>
    );
  }

  return (
    <div
      {...getRootProps()}
      className={cn(
        "group relative overflow-hidden rounded-3xl transition-all cursor-pointer",
        "px-8 py-16 flex flex-col items-center justify-center text-center",
        "border-2 border-dashed",
        isDragActive
          ? "border-indigo-500 bg-gradient-to-br from-indigo-50 via-white to-purple-50 scale-[1.01] shadow-2xl shadow-indigo-500/10"
          : "border-slate-300/80 bg-white/70 backdrop-blur-md hover:border-indigo-400 hover:bg-white/90 hover:shadow-xl hover:shadow-indigo-500/5",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      <input {...getInputProps()} />

      {/* Decorative floating PDFs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40 group-hover:opacity-60 transition-opacity">
        <div className="absolute top-6 left-10 rotate-[-12deg]">
          <div className="h-14 w-11 rounded bg-gradient-to-br from-red-100 to-red-50 border border-red-200 flex items-center justify-center shadow-sm">
            <FileText className="h-5 w-5 text-red-400" />
          </div>
        </div>
        <div className="absolute top-10 right-12 rotate-[8deg]">
          <div className="h-14 w-11 rounded bg-gradient-to-br from-orange-100 to-orange-50 border border-orange-200 flex items-center justify-center shadow-sm">
            <FileText className="h-5 w-5 text-orange-400" />
          </div>
        </div>
        <div className="absolute bottom-8 left-20 rotate-[15deg]">
          <div className="h-14 w-11 rounded bg-gradient-to-br from-pink-100 to-pink-50 border border-pink-200 flex items-center justify-center shadow-sm">
            <FileText className="h-5 w-5 text-pink-400" />
          </div>
        </div>
        <div className="absolute bottom-10 right-24 rotate-[-10deg]">
          <div className="h-14 w-11 rounded bg-gradient-to-br from-purple-100 to-purple-50 border border-purple-200 flex items-center justify-center shadow-sm">
            <FileText className="h-5 w-5 text-purple-400" />
          </div>
        </div>
      </div>

      {/* Halo */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-64 w-64 rounded-full bg-indigo-300/20 blur-3xl" />
      </div>

      <div className="relative">
        <div
          className={cn(
            "h-24 w-24 rounded-3xl flex items-center justify-center mb-6 transition-all",
            "bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500",
            "shadow-xl shadow-indigo-500/30",
            isDragActive ? "scale-110" : "group-hover:scale-105 group-hover:rotate-3"
          )}
        >
          <UploadCloud className="h-12 w-12 text-white" />
        </div>
      </div>

      <p className="relative text-xl font-bold text-slate-900">
        {isDragActive ? "Solte para adicionar" : "Arraste seus PDFs aqui"}
      </p>
      <p className="relative text-sm text-slate-600 mt-2">
        ou{" "}
        <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent font-semibold underline decoration-indigo-400/50 underline-offset-4">
          clique para selecionar
        </span>
      </p>
      <p className="relative text-xs text-slate-500 mt-4 flex items-center gap-2">
        <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
        Múltiplos arquivos
      </p>
    </div>
  );
}
