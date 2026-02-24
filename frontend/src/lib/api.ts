import type {
  AdminUserRead,
  AnalysisOutput,
  CaseListItem,
  CaseRead,
  CaseTemplate,
  CohortRead,
  CohortStatus,
  DebriefInput,
  FeedbackMode,
  FinalMemo,
  PreparationInput,
  TokenResponse,
  UserProfile,
} from "./types";

const API_BASE = "http://localhost:8000";
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
    const body = await response.json().catch(() => ({}));
    throw new Error(body.detail ?? "Error en la API");
  }

  return response.json() as Promise<T>;
}

export const api = {
  login: (email: string, password: string) =>
    request<TokenResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  me: () => request<UserProfile>("/auth/me"),
  adminListUsers: () => request<AdminUserRead[]>("/admin/users"),
  adminCreateUser: (payload: { email: string; password: string; full_name: string; role: "admin" | "student" }) =>
    request<AdminUserRead>("/admin/users", {
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
  createCase: (title: string, mode: FeedbackMode) =>
    request<CaseRead>("/cases", {
      method: "POST",
      body: JSON.stringify({ title, mode }),
    }),
  createCaseFromTemplate: (templateId: string) =>
    request<CaseRead>(`/cases/from-template/${templateId}`, {
      method: "POST",
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
  closeCase: (id: number) =>
    request<FinalMemo>(`/cases/${id}/close`, {
      method: "POST",
    }),
};
