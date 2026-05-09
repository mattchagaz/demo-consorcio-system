"use client";

import { useState, useEffect, useTransition } from "react";
import { Header } from "@/components/Header";
import {
  listUsers,
  inviteUser,
  removeUser,
  getConversionMetrics,
  type ConversionMetrics,
  type ConversionMetricJob,
} from "./actions";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  FileSpreadsheet,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Upload,
  User,
  UserPlus,
} from "lucide-react";
import Link from "next/link";

type UserRow = {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: number;
  imageUrl: string;
};

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

const numberFmt = new Intl.NumberFormat("pt-BR");

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function actionLabel(action: ConversionMetricJob["action"]) {
  if (action === "preview") return "Pré-visualização";
  if (action === "export") return "Excel direto";
  return "Excel da prévia";
}

function MetricCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: typeof Upload;
  label: string;
  value: number;
  sub: string;
}) {
  return (
    <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-200 p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-slate-500">{label}</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{numberFmt.format(value)}</p>
        </div>
        <div className="h-10 w-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
          <Icon className="h-5 w-5 text-indigo-600" />
        </div>
      </div>
      <p className="mt-3 text-xs text-slate-500">{sub}</p>
    </div>
  );
}

export default function AdminPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [metrics, setMetrics] = useState<ConversionMetrics | null>(null);
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [metricsError, setMetricsError] = useState("");
  const [success, setSuccess] = useState("");
  const [isPending, startTransition] = useTransition();
  const [loading, setLoading] = useState(true);

  const load = () => {
    startTransition(async () => {
      try {
        const data = await listUsers();
        setUsers(data);
        setError("");
        try {
          setMetrics(await getConversionMetrics());
          setMetricsError("");
        } catch (e: unknown) {
          setMetricsError(errorMessage(e, "Erro ao carregar métricas"));
        }
      } catch (e: unknown) {
        setError(errorMessage(e, "Erro ao carregar usuários"));
      } finally {
        setLoading(false);
      }
    });
  };

  useEffect(() => { load(); }, []);

  const handleInvite = () => {
    if (!email.includes("@")) {
      setError("E-mail inválido");
      return;
    }
    setError("");
    setSuccess("");
    startTransition(async () => {
      try {
        await inviteUser(email);
        setEmail("");
        setSuccess(`Convite enviado para ${email}`);
        load();
      } catch (e: unknown) {
        setError(errorMessage(e, "Erro ao convidar"));
      }
    });
  };

  const handleRemove = (user: UserRow) => {
    if (!confirm(`Tem certeza que deseja remover ${user.email}?`)) return;
    setError("");
    setSuccess("");
    startTransition(async () => {
      try {
        await removeUser(user.id);
        setSuccess(`${user.email} removido`);
        load();
      } catch (e: unknown) {
        setError(errorMessage(e, "Erro ao remover"));
      }
    });
  };

  return (
    <div className="min-h-screen app-bg flex-1 flex flex-col">
      <Header />
      <main className="relative z-10 flex-1 w-full max-w-3xl mx-auto px-6 py-10 space-y-8">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Link>
          <h2 className="text-2xl font-bold text-slate-900">Gerenciar Usuários</h2>
        </div>

        {/* Conversion metrics */}
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Activity className="h-4 w-4 text-indigo-500" />
              Controle de conversões
            </h3>
            <button
              onClick={load}
              disabled={isPending}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isPending ? "animate-spin" : ""}`} />
              Atualizar
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <MetricCard
              icon={Upload}
              label="PDFs enviados"
              value={metrics?.totals.uploaded_count ?? 0}
              sub={`Hoje: ${numberFmt.format(metrics?.today.uploaded_count ?? 0)}`}
            />
            <MetricCard
              icon={CheckCircle2}
              label="PDFs convertidos"
              value={metrics?.totals.parsed_count ?? 0}
              sub={`Hoje: ${numberFmt.format(metrics?.today.parsed_count ?? 0)}`}
            />
            <MetricCard
              icon={AlertTriangle}
              label="PDFs com erro"
              value={metrics?.totals.failed_count ?? 0}
              sub={`Hoje: ${numberFmt.format(metrics?.today.failed_count ?? 0)}`}
            />
            <MetricCard
              icon={FileSpreadsheet}
              label="Excels baixados"
              value={metrics?.totals.excel_count ?? 0}
              sub={`${numberFmt.format(metrics?.totals.output_count ?? 0)} PDFs em Excel`}
            />
          </div>

          <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-700">Últimas operações</h3>
              {metrics && (
                <span className="text-xs text-slate-500">
                  {numberFmt.format(metrics.totals.jobs)} registro{metrics.totals.jobs === 1 ? "" : "s"}
                </span>
              )}
            </div>

            {metricsError ? (
              <div className="px-6 py-5 text-sm text-red-600">{metricsError}</div>
            ) : loading && !metrics ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
              </div>
            ) : !metrics || metrics.recent_jobs.length === 0 ? (
              <div className="text-center py-10 text-sm text-slate-500">
                Nenhuma conversão registrada ainda
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {metrics.recent_jobs.map((job) => (
                  <li key={job.id} className="px-6 py-4 flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium text-slate-900">
                          {actionLabel(job.action)}
                        </p>
                        <span
                          className={
                            job.status === "success"
                              ? "px-2 py-0.5 rounded-full bg-emerald-50 text-xs font-medium text-emerald-700 border border-emerald-100"
                              : "px-2 py-0.5 rounded-full bg-red-50 text-xs font-medium text-red-700 border border-red-100"
                          }
                        >
                          {job.status === "success" ? "Sucesso" : "Erro"}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        {formatDateTime(job.created_at)} · {job.user_email ?? "Usuário não informado"}
                      </p>
                      {job.file_names.length > 0 && (
                        <p className="mt-1 text-xs text-slate-500 truncate">
                          {job.file_names.slice(0, 4).join(", ")}
                          {job.file_names.length > 4 ? ` +${job.file_names.length - 4}` : ""}
                        </p>
                      )}
                      {job.error_message && (
                        <p className="mt-1 text-xs text-red-600 truncate">{job.error_message}</p>
                      )}
                    </div>
                    <div className="shrink-0 text-right text-xs text-slate-500">
                      <p>{numberFmt.format(job.uploaded_count)} enviados</p>
                      <p>{numberFmt.format(job.parsed_count)} convertidos</p>
                      {job.output_count > 0 && (
                        <p>{numberFmt.format(job.output_count)} no Excel</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* Invite form */}
        <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-indigo-500" />
            Convidar novo usuário
          </h3>
          <div className="flex gap-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleInvite()}
              placeholder="email@empresa.com"
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              disabled={isPending}
            />
            <button
              onClick={handleInvite}
              disabled={isPending || !email}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-sm font-medium shadow-lg shadow-indigo-600/20 disabled:opacity-50 transition"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              Convidar
            </button>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          {success && <p className="text-sm text-emerald-600">{success}</p>}
        </div>

        {/* Users list */}
        <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-700">
              Usuários ({users.length})
            </h3>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-12 text-sm text-slate-500">
              Nenhum usuario cadastrado
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {users.map((u) => (
                <li key={u.id} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50/50 transition">
                  <div className="flex items-center gap-3">
                    {u.imageUrl ? (
                      <img src={u.imageUrl} alt="" className="h-9 w-9 rounded-full" />
                    ) : (
                      <div className="h-9 w-9 rounded-full bg-slate-200 flex items-center justify-center">
                        <User className="h-4 w-4 text-slate-500" />
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {u.name || u.email}
                      </p>
                      <p className="text-xs text-slate-500">{u.email}</p>
                    </div>
                    {u.role === "admin" && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 text-xs font-medium text-indigo-700 border border-indigo-100">
                        <ShieldCheck className="h-3 w-3" />
                        Admin
                      </span>
                    )}
                  </div>
                  {u.role !== "admin" && (
                    <button
                      onClick={() => handleRemove(u)}
                      disabled={isPending}
                      className="text-slate-400 hover:text-red-600 transition disabled:opacity-50"
                      title="Remover usuário"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}
