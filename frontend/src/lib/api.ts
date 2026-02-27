import type {
  AdminAnonymousMetricsSummary,
  AdminUserRead,
  AnalysisOutput,
  CaseListItem,
  CaseRead,
  CaseTemplate,
  CloseCaseInput,
  CohortRead,
  CohortStatus,
  DebriefInput,
  FeedbackMode,
  FinalMemo,
  LeaderEvaluationCreate,
  LeaderEvaluationRead,
  PreparationInput,
  StudentMetricsSummary,
  TokenResponse,
  UserProfile,
} from "./types";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";
const AUTH_TOKEN_KEY = "rb_auth_token";

let authToken = localStorage.getItem(AUTH_TOKEN_KEY);

export function setAuthToken(token: string | null) {
  authToken = token;
  if (token) {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
  } else {
    localStorage.removeItem(AUTH_TOKEN_KEY);
  }
}

export function getAuthToken(): string | null {
  return authToken;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...(options?.headers ?? {}),
    },
    ...options,
  });

  if (!response.ok) {
    let body;
    try {
      body = await response.json();
    } catch (err) {
      throw new Error("La respuesta de la API no es JSON válido. Puede que el backend esté caído o la ruta sea incorrecta.");
    }
    throw new Error(body.detail ?? "Error en la API");
  }

  try {
    return await response.json() as Promise<T>;
  } catch (err) {
    throw new Error("La respuesta de la API no es JSON válido. Puede que el backend esté caído o la ruta sea incorrecta.");
  }
}

export const api = {
  login: (email: string, password: string) =>
    request<TokenResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  me: () => request<UserProfile>("/api/auth/me"),
  adminListUsers: () => request<AdminUserRead[]>("/api/admin/users"),
  adminCreateUser: (payload: { email: string; password: string; full_name: string; role: "admin" | "student" }) =>
    request<AdminUserRead>("/api/admin/users", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  adminListCohorts: () => request<CohortRead[]>("/admin/cohorts"),
  adminCreateCohort: (payload: { name: string; start_date: string; end_date: string; status: CohortStatus }) =>
    request<CohortRead>("/admin/cohorts", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  adminAddCohortMembers: (cohortId: number, userIds: number[]) =>
    request<{ ok: boolean; added: number }>(`/admin/cohorts/${cohortId}/members`, {
      method: "POST",
      body: JSON.stringify({ user_ids: userIds }),
    }),
  adminListCohortMembers: (cohortId: number) =>
    request<AdminUserRead[]>(`/admin/cohorts/${cohortId}/members`),
  adminRemoveCohortMember: (cohortId: number, userId: number) =>
    request<{ ok: boolean }>(`/admin/cohorts/${cohortId}/members/${userId}`, {
      method: "DELETE",
    }),
  listCaseTemplates: () => request<CaseTemplate[]>("/case-templates"),
  listCases: () => request<CaseListItem[]>("/cases"),
  getCase: (id: number) => request<CaseRead>(`/cases/${id}`),
  createCase: (title: string, mode: FeedbackMode, confidenceStart?: number) =>
    request<CaseRead>("/cases", {
      method: "POST",
      body: JSON.stringify({ title, mode, confidence_start: confidenceStart ?? null }),
    }),
  createCaseFromTemplate: (templateId: string, confidenceStart?: number) =>
    request<CaseRead>(`/cases/from-template/${templateId}`, {
      method: "POST",
      body: JSON.stringify({ confidence_start: confidenceStart ?? null }),
    }),
  deleteCase: (id: number) =>
    request<{ ok: boolean }>(`/cases/${id}`, {
      method: "DELETE",
    }),
  savePreparation: (id: number, payload: PreparationInput) =>
    request<CaseRead>(`/cases/${id}/preparation`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  analyzeCase: (id: number) =>
    request<AnalysisOutput>(`/cases/${id}/analyze`, {
      method: "POST",
    }),
  markExecuted: (id: number) =>
    request<CaseRead>(`/cases/${id}/execute`, {
      method: "POST",
    }),
  saveDebrief: (id: number, payload: DebriefInput) =>
    request<CaseRead>(`/cases/${id}/debrief`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  closeCase: (id: number, payload: CloseCaseInput) =>
    request<FinalMemo>(`/cases/${id}/close`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  getMyMetrics: () => request<StudentMetricsSummary>("/metrics/me"),
  getAdminAnonymousMetrics: (cohortId?: number | null) =>
    request<AdminAnonymousMetricsSummary>(
      cohortId ? `/admin/metrics/anonymous?cohort_id=${cohortId}` : "/admin/metrics/anonymous",
    ),
  adminCreateLeaderEvaluation: (payload: LeaderEvaluationCreate) =>
    request<LeaderEvaluationRead>("/admin/leader-evaluations", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  adminListLeaderEvaluations: (filters?: { targetUserId?: number; cohortId?: number; periodLabel?: string }) => {
    const params = new URLSearchParams();
    if (filters?.targetUserId != null) params.set("target_user_id", String(filters.targetUserId));
    if (filters?.cohortId != null) params.set("cohort_id", String(filters.cohortId));
    if (filters?.periodLabel) params.set("period_label", filters.periodLabel);
    const suffix = params.toString() ? `?${params.toString()}` : "";
    return request<LeaderEvaluationRead[]>(`/admin/leader-evaluations${suffix}`);
  },
  listMyLeaderEvaluations: () => request<LeaderEvaluationRead[]>("/leader-evaluations/me"),
};
