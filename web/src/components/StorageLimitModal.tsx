"use client";

import { HardDrive, X } from "lucide-react";
import { useEffect } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function StorageLimitModal({ open, onClose }: Props) {
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 backdrop-blur-sm animate-fade-in"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="storage-limit-title"
        aria-describedby="storage-limit-description"
        className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/70 bg-white p-7 shadow-2xl shadow-slate-950/20 animate-modal-in"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar aviso"
          className="absolute right-4 top-4 rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-100 to-orange-100 text-amber-700 ring-1 ring-amber-200/70">
          <HardDrive className="h-7 w-7" />
        </div>

        <h2
          id="storage-limit-title"
          className="pr-8 text-2xl font-bold tracking-tight text-slate-900"
        >
          Limite de armazenamento atingido
        </h2>
        <p
          id="storage-limit-description"
          className="mt-3 text-sm leading-6 text-slate-600"
        >
          Seu espaço disponível acabou. Para converter novos arquivos, amplie o
          limite do seu plano.
        </p>

        <button
          type="button"
          onClick={onClose}
          autoFocus
          className="mt-7 inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 transition hover:from-indigo-500 hover:to-purple-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          Entendi
        </button>
      </div>
    </div>
  );
}
