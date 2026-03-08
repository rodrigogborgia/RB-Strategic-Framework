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
  DemoStartResponse,
  PublicLeadCaptureResponse,
  StudentMetricsSummary,
  TokenResponse,
  UserProfile,
} from "./types";

const API_BASE = (typeof __VITE_API_URL__ !== "undefined" && __VITE_API_URL__) || "http://localhost:8000";
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
    let rawText;
    try {
      body = await response.json();
    } catch (err) {
      rawText = await response.text();
      console.error("No se pudo parsear el cuerpo de la respuesta como JSON:", err);
      console.error("Respuesta RAW:", rawText);
      console.error("Status:", response.status);
      throw new Error(`La respuesta de la API no es JSON válido. Path: ${path}, Método: ${options?.method || 'GET'}. Puede que el backend esté caído o la ruta sea incorrecta. Status: ${response.status}. Respuesta RAW: ${rawText}`);
    }
    // Si la respuesta tiene error, mostrar el detalle
    if (!response.ok) {
      let errorDetail = body?.detail;
      if (errorDetail && typeof errorDetail === "object") {
        errorDetail = JSON.stringify(errorDetail);
      }
      throw new Error(`Error en la API. Path: ${path}, Método: ${options?.method || 'GET'}. Status: ${response.status}. Detalle: ${errorDetail}`);
    }
  }

  try {
    return await response.json() as Promise<T>;
  } catch (err) {
    throw new Error(`La respuesta de la API no es JSON válido. Path: ${path}, Método: ${options?.method || 'GET'}. Puede que el backend esté caído o la ruta sea incorrecta.`);
  }
}

export const api = {
  login: (email: string, password: string) =>
    request<TokenResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  capturePublicLead: (email: string, preocupacion_negociacion: string, source: string = "modal") =>
    request<PublicLeadCaptureResponse>("/api/public/leads/contact", {
      method: "POST",
      body: JSON.stringify({ email, preocupacion_negociacion, source }),
    }),
  startPublicDemo: (email: string) =>
    request<DemoStartResponse>("/api/public/demo/start", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),
  solicitorAsesoria: (email: string, nombre: string, tamaño_equipo: string, preocupacion: string) =>
    request<PublicLeadCaptureResponse>("/api/public/solicitar-asesoria", {
      method: "POST",
      body: JSON.stringify({ email, nombre, tamaño_equipo, preocupacion }),
    }),
  protocolo48h: (email: string) =>
    request<PublicLeadCaptureResponse>("/api/public/protocolo-48h", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),
  pdfDownload: (name: string, email: string, pdfName: string) =>
    request<PublicLeadCaptureResponse>("/api/public/pdf-download", {
      method: "POST",
      body: JSON.stringify({ name, email, pdf_name: pdfName }),
    }),
  adminUpdateCohortMembership: (cohortId: number, userId: number, payload: { is_active: boolean; expiry_date: string | null }) =>
    request<{ ok: boolean }>(`/api/admin/cohorts/${cohortId}/members/${userId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  me: () => request<UserProfile>("/api/auth/me"),
  adminListUsers: () => request<AdminUserRead[]>("/api/admin/users"),
  adminCreateUser: (payload: { email: string; password: string; full_name: string; role: "admin" | "student" }) =>
    request<AdminUserRead>("/api/admin/users", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  adminListCohorts: () => request<CohortRead[]>("/api/admin/cohorts"),
  adminCreateCohort: (payload: { name: string; start_date: string; end_date: string; status: CohortStatus }) =>
    request<CohortRead>("/api/admin/cohorts", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  adminAddCohortMembers: (cohortId: number, userIds: number[]) =>
    request<{ ok: boolean; added: number }>(`/api/admin/cohorts/${cohortId}/members`, {
      method: "POST",
      body: JSON.stringify({ user_ids: userIds }),
    }),
  adminListCohortMembers: (cohortId: number) =>
    request<AdminUserRead[]>(`/api/admin/cohorts/${cohortId}/members`),
  adminGetCohortMember: (cohortId: number, userId: number) =>
    request<{ id: number; user_id: number; cohort_id: number; joined_at: string; left_at: string | null; is_active: boolean; expiry_date: string | null }>(`/api/admin/cohorts/${cohortId}/members/${userId}`),
  adminRemoveCohortMember: (cohortId: number, userId: number) =>
    request<{ ok: boolean }>(`/api/admin/cohorts/${cohortId}/members/${userId}`, {
      method: "DELETE",
    }),
  listCaseTemplates: () => request<CaseTemplate[]>("/api/case-templates"),
  listCases: () => request<CaseListItem[]>("/api/cases"),
  getCase: (id: number) => request<CaseRead>(`/api/cases/${id}`),
  createCase: (title: string, mode: FeedbackMode, confidenceStart?: number) =>
    request<CaseRead>("/api/cases", {
      method: "POST",
      body: JSON.stringify({ title, mode, confidence_start: confidenceStart ?? null }),
    }),
  createCaseFromTemplate: (templateId: string, confidenceStart?: number) =>
    request<CaseRead>(`/api/cases/from-template/${templateId}`, {
      method: "POST",
      body: JSON.stringify({ confidence_start: confidenceStart ?? null }),
    }),
  deleteCase: (id: number) =>
    request<{ ok: boolean }>(`/api/cases/${id}`, {
      method: "DELETE",
    }),
  savePreparation: (id: number, payload: PreparationInput) =>
    request<CaseRead>(`/api/cases/${id}/preparation`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  analyzeCase: (id: number) =>
    request<AnalysisOutput>(`/api/cases/${id}/analyze`, {
      method: "POST",
    }),
  markExecuted: (id: number) =>
    request<CaseRead>(`/api/cases/${id}/execute`, {
      method: "POST",
    }),
  saveDebrief: (id: number, payload: DebriefInput) =>
    request<CaseRead>(`/api/cases/${id}/debrief`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  closeCase: (id: number, payload: CloseCaseInput) =>
    request<FinalMemo>(`/api/cases/${id}/close`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  getMyMetrics: () => request<StudentMetricsSummary>("/api/metrics/me"),
  getAdminAnonymousMetrics: (cohortId?: number | null) =>
    request<AdminAnonymousMetricsSummary>(
      cohortId ? `/api/admin/metrics/anonymous?cohort_id=${cohortId}` : "/api/admin/metrics/anonymous",
    ),
  adminCreateLeaderEvaluation: (payload: LeaderEvaluationCreate) =>
    request<LeaderEvaluationRead>("/api/admin/leader-evaluations", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  adminListLeaderEvaluations: (filters?: { targetUserId?: number; cohortId?: number; periodLabel?: string }) => {
    const params = new URLSearchParams();
    if (filters?.targetUserId != null) params.set("target_user_id", String(filters.targetUserId));
    if (filters?.cohortId != null) params.set("cohort_id", String(filters.cohortId));
    if (filters?.periodLabel) params.set("period_label", filters.periodLabel);
    const suffix = params.toString() ? `?${params.toString()}` : "";
    return request<LeaderEvaluationRead[]>(`/api/admin/leader-evaluations${suffix}`);
  },
  listMyLeaderEvaluations: () => request<LeaderEvaluationRead[]>("/api/leader-evaluations/me"),
};
