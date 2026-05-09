"use server";

import { clerkClient, currentUser } from "@clerk/nextjs/server";

function metadataRole(publicMetadata: unknown) {
  const role =
    typeof publicMetadata === "object" && publicMetadata !== null && "role" in publicMetadata
      ? (publicMetadata as { role?: unknown }).role
      : undefined;

  return typeof role === "string" ? role : "user";
}

async function requireAdmin() {
  const user = await currentUser();
  if (!user) throw new Error("Não autenticado");
  if (metadataRole(user.publicMetadata) !== "admin") {
    throw new Error("Acesso negado");
  }
  return user;
}

function appUrl(path: string) {
  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL;
  const vercelUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
  const baseUrl = configuredUrl ?? (vercelUrl ? `https://${vercelUrl}` : "http://localhost:3000");

  return new URL(path, baseUrl).toString();
}

function apiUrl(path: string) {
  const baseUrl = process.env.API_URL ?? "http://localhost:8000";
  return new URL(path, baseUrl).toString();
}

export type ConversionMetricBucket = {
  jobs: number;
  uploaded_count: number;
  parsed_count: number;
  failed_count: number;
  output_count: number;
  excel_count: number;
};

export type ConversionMetricJob = {
  id: number;
  created_at: string;
  action: "preview" | "export" | "export_json";
  user_email: string | null;
  uploaded_count: number;
  parsed_count: number;
  failed_count: number;
  output_count: number;
  status: "success" | "error";
  error_message: string | null;
  file_names: string[];
};

export type ConversionMetrics = {
  db_path: string;
  totals: ConversionMetricBucket;
  today: ConversionMetricBucket;
  daily: Array<{ date: string } & ConversionMetricBucket>;
  recent_jobs: ConversionMetricJob[];
};

export async function listUsers() {
  await requireAdmin();
  const clerk = await clerkClient();
  const { data: users } = await clerk.users.getUserList({ limit: 100 });
  return users.map((u) => ({
    id: u.id,
    email: u.emailAddresses[0]?.emailAddress ?? "",
    name: `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim(),
    role: metadataRole(u.publicMetadata),
    createdAt: u.createdAt,
    imageUrl: u.imageUrl,
  }));
}

export async function inviteUser(email: string) {
  await requireAdmin();
  const clerk = await clerkClient();
  await clerk.invitations.createInvitation({
    emailAddress: email,
    redirectUrl: appUrl("/sign-up"),
  });
}

export async function removeUser(userId: string) {
  const admin = await requireAdmin();
  if (userId === admin.id) throw new Error("Você não pode remover a si mesmo");
  const clerk = await clerkClient();
  await clerk.users.deleteUser(userId);
}

export async function getConversionMetrics(): Promise<ConversionMetrics> {
  await requireAdmin();
  const headers: Record<string, string> = {};
  const token = process.env.API_METRICS_TOKEN ?? process.env.METRICS_TOKEN;
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(apiUrl("/metrics/summary"), {
    headers,
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(await res.text());
  }

  return res.json();
}
