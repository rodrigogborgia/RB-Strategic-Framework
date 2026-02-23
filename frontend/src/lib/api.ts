import type {
  AnalysisOutput,
  CaseListItem,
  CaseRead,
  CaseTemplate,
  DebriefInput,
  FeedbackMode,
  FinalMemo,
  PreparationInput,
} from "./types";

const API_BASE = "http://localhost:8000";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
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
