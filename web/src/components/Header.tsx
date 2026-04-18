"use client";

import { FileSpreadsheet, Settings } from "lucide-react";
import { UserButton, useUser } from "@clerk/nextjs";
import Link from "next/link";

export function Header() {
  const { user } = useUser();
  const isAdmin = user?.publicMetadata.role === "admin";

  return (
    <header className="sticky top-0 z-30 glass border-b border-white/50">
      <div className="max-w-6xl mx-auto px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-xl opacity-60" />
            <div className="relative h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
              <FileSpreadsheet className="h-5 w-5 text-white" />
            </div>
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-slate-900">
              Consórcio PDF → Excel
            </h1>
            <p className="text-xs text-slate-500 -mt-0.5">
              Extração automática de extratos
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isAdmin && (
            <Link
              href="/admin"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/80 border border-indigo-100 text-xs font-semibold text-indigo-700 shadow-sm hover:bg-indigo-50 transition"
            >
              <Settings className="h-3.5 w-3.5" />
              Gerenciar
            </Link>
          )}
          <UserButton />
        </div>
      </div>
    </header>
  );
}
