import {
  clearSession,
  readSession,
  updateTokens,
} from "@/lib/auth-storage";
import type {
  AdminLog,
  AdminOverview,
  AdminUserRow,
  ArticleRecord,
  AuthResponse,
  CaseRecord,
  Chat,
  ChatSummary,
  ConsultResponse,
  Favorite,
  FavoriteTargetType,
  LawyerRecord,
  PaginatedResponse,
  StreamDonePayload,
  TokenPair,
  User,
} from "@/lib/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000/api/v1";

type RequestOptions = RequestInit & {
  auth?: boolean;
};

async function tryRefreshToken(): Promise<TokenPair | null> {
  const session = readSession();
  const refreshToken = session.tokens?.refresh_token;
  if (!refreshToken) {
    return null;
  }

  const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  if (!response.ok) {
    clearSession();
    return null;
  }

  const tokens = (await response.json()) as TokenPair;
  updateTokens(tokens);
  return tokens;
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { auth = false, headers, ...rest } = options;
  const session = readSession();
  const mergedHeaders = new Headers(headers);
  if (!mergedHeaders.has("Content-Type") && !(rest.body instanceof FormData)) {
    mergedHeaders.set("Content-Type", "application/json");
  }
  if (auth && session.tokens?.access_token) {
    mergedHeaders.set("Authorization", `Bearer ${session.tokens.access_token}`);
  }

  let response = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: mergedHeaders,
  });

  if (response.status === 401 && auth) {
    const nextTokens = await tryRefreshToken();
    if (nextTokens) {
      mergedHeaders.set("Authorization", `Bearer ${nextTokens.access_token}`);
      response = await fetch(`${API_BASE_URL}${path}`, {
        ...rest,
        headers: mergedHeaders,
      });
    }
  }

  if (!response.ok) {
    let detail = "Ошибка запроса";
    try {
      const body = await response.json();
      detail = body.detail ?? body.message ?? detail;
    } catch {
      detail = await response.text();
    }
    throw new Error(detail || "Ошибка запроса");
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export async function register(payload: { email: string; password: string; full_name?: string }) {
  return apiFetch<AuthResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function login(payload: { email: string; password: string }) {
  return apiFetch<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function logout() {
  const session = readSession();
  if (!session.tokens?.refresh_token) {
    clearSession();
    return;
  }
  try {
    await apiFetch("/auth/logout", {
      method: "POST",
      body: JSON.stringify({ refresh_token: session.tokens.refresh_token }),
    });
  } finally {
    clearSession();
  }
}

export function getMe() {
  return apiFetch<User>("/users/me", { auth: true });
}

export function updateMe(payload: { full_name?: string | null; avatar_url?: string | null }) {
  return apiFetch<User>("/users/me", {
    method: "PATCH",
    auth: true,
    body: JSON.stringify(payload),
  });
}

export function getMyHistory() {
  return apiFetch<ChatSummary[]>("/users/me/history", { auth: true });
}

export function getMyFavorites() {
  return apiFetch<Favorite[]>("/users/me/favorites", { auth: true });
}

export function addFavorite(payload: { target_type: FavoriteTargetType; target_id: string | number }) {
  return apiFetch<Favorite>("/users/me/favorites", {
    method: "POST",
    auth: true,
    body: JSON.stringify(payload),
  });
}

export function removeFavorite(favoriteId: string) {
  return apiFetch<{ success: boolean }>(`/users/me/favorites/${favoriteId}`, {
    method: "DELETE",
    auth: true,
  });
}

export function listChats() {
  return apiFetch<ChatSummary[]>("/chats", { auth: true });
}

export function createChat(title?: string) {
  return apiFetch<Chat>("/chats", {
    method: "POST",
    auth: true,
    body: JSON.stringify({ title }),
  });
}

export function getChat(chatId: string) {
  return apiFetch<Chat>(`/chats/${chatId}`, { auth: true });
}

export function renameChat(chatId: string, title: string) {
  return apiFetch<Chat>(`/chats/${chatId}`, {
    method: "PATCH",
    auth: true,
    body: JSON.stringify({ title }),
  });
}

export function deleteChat(chatId: string) {
  return apiFetch<{ success: boolean }>(`/chats/${chatId}`, {
    method: "DELETE",
    auth: true,
  });
}

export async function streamChatMessage(
  chatId: string,
  message: string,
  handlers: {
    onChunk?: (chunk: string) => void;
    onCases?: (cases: ConsultResponse["cases"]) => void;
    onDone?: (payload: StreamDonePayload) => void;
  },
) {
  const session = readSession();
  let accessToken = session.tokens?.access_token;
  if (!accessToken) {
    const refreshed = await tryRefreshToken();
    accessToken = refreshed?.access_token;
  }
  if (!accessToken) {
    throw new Error("Требуется авторизация.");
  }

  const sendStreamRequest = (token: string) =>
    fetch(`${API_BASE_URL}/chats/${chatId}/stream`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ message }),
    });

  let response = await sendStreamRequest(accessToken);
  if (response.status === 401) {
    const refreshed = await tryRefreshToken();
    if (refreshed?.access_token) {
      accessToken = refreshed.access_token;
      response = await sendStreamRequest(accessToken);
    }
  }

  if (!response.ok || !response.body) {
    const detail = await response.text();
    throw new Error(detail || "Не удалось получить потоковый ответ.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";

    for (const part of parts) {
      const line = part
        .split("\n")
        .find((item) => item.startsWith("data: "));

      if (!line) {
        continue;
      }

      const payload = JSON.parse(line.slice(6)) as {
        type: "chunk" | "cases" | "done";
        content: string | ConsultResponse["cases"] | StreamDonePayload;
      };

      if (payload.type === "chunk" && typeof payload.content === "string") {
        handlers.onChunk?.(payload.content);
      }
      if (payload.type === "cases" && Array.isArray(payload.content)) {
        handlers.onCases?.(payload.content);
      }
      if (payload.type === "done" && typeof payload.content === "object") {
        handlers.onDone?.(payload.content as StreamDonePayload);
      }
    }
  }
}

export function listCases(query = "", page = 1) {
  const params = new URLSearchParams({ page: String(page) });
  if (query) {
    params.set("query", query);
  }
  return apiFetch<PaginatedResponse<CaseRecord>>(`/cases?${params.toString()}`);
}

export function getCase(caseId: number | string) {
  return apiFetch<CaseRecord>(`/cases/${caseId}`);
}

export function getRelatedCases(caseId: number | string) {
  return apiFetch<CaseRecord[]>(`/cases/${caseId}/related`);
}

export function listLawyers(query = "", specialization = "", page = 1) {
  const params = new URLSearchParams({ page: String(page) });
  if (query) {
    params.set("query", query);
  }
  if (specialization) {
    params.set("specialization", specialization);
  }
  return apiFetch<PaginatedResponse<LawyerRecord>>(`/lawyers?${params.toString()}`);
}

export function getLawyer(lawyerId: number | string) {
  return apiFetch<LawyerRecord>(`/lawyers/${lawyerId}`);
}

export function listArticles(query = "", kind = "", page = 1) {
  const params = new URLSearchParams({ page: String(page) });
  if (query) {
    params.set("query", query);
  }
  if (kind) {
    params.set("kind", kind);
  }
  return apiFetch<PaginatedResponse<ArticleRecord>>(`/articles?${params.toString()}`);
}

export function getArticle(articleId: number | string) {
  return apiFetch<ArticleRecord>(`/articles/${articleId}`);
}

export function adminOverview() {
  return apiFetch<AdminOverview>("/admin/overview", { auth: true });
}

export function adminLogs() {
  return apiFetch<AdminLog[]>("/admin/logs", { auth: true });
}

export function adminUsers() {
  return apiFetch<AdminUserRow[]>("/admin/users", { auth: true });
}

export function adminUpdateUser(userId: number, payload: Partial<Pick<AdminUserRow, "role" | "is_blocked">>) {
  return apiFetch<{ success: boolean }>(`/admin/users/${userId}`, {
    method: "PATCH",
    auth: true,
    body: JSON.stringify(payload),
  });
}

export function adminLawyers() {
  return apiFetch<LawyerRecord[]>("/admin/lawyers", { auth: true });
}

export function adminCreateLawyer(payload: Partial<LawyerRecord> & { name: string; specialization: string; description: string }) {
  return apiFetch<LawyerRecord>("/admin/lawyers", {
    method: "POST",
    auth: true,
    body: JSON.stringify(payload),
  });
}

export function adminUpdateLawyer(lawyerId: number, payload: Partial<LawyerRecord> & { name: string; specialization: string; description: string }) {
  return apiFetch<LawyerRecord>(`/admin/lawyers/${lawyerId}`, {
    method: "PUT",
    auth: true,
    body: JSON.stringify(payload),
  });
}

export function adminDeleteLawyer(lawyerId: number) {
  return apiFetch<{ success: boolean }>(`/admin/lawyers/${lawyerId}`, {
    method: "DELETE",
    auth: true,
  });
}

export function adminArticles() {
  return apiFetch<ArticleRecord[]>("/admin/articles", { auth: true });
}

export function adminCreateArticle(payload: Partial<ArticleRecord> & { title: string; slug: string; content: string }) {
  return apiFetch<ArticleRecord>("/admin/articles", {
    method: "POST",
    auth: true,
    body: JSON.stringify(payload),
  });
}

export function adminUpdateArticle(articleId: number, payload: Partial<ArticleRecord> & { title: string; slug: string; content: string }) {
  return apiFetch<ArticleRecord>(`/admin/articles/${articleId}`, {
    method: "PUT",
    auth: true,
    body: JSON.stringify(payload),
  });
}

export function adminDeleteArticle(articleId: number) {
  return apiFetch<{ success: boolean }>(`/admin/articles/${articleId}`, {
    method: "DELETE",
    auth: true,
  });
}

export function adminCases(query = "") {
  const params = new URLSearchParams();
  if (query) {
    params.set("query", query);
  }
  return apiFetch<CaseRecord[]>(`/admin/cases${params.toString() ? `?${params.toString()}` : ""}`, {
    auth: true,
  });
}

export function adminCreateCase(payload: Partial<CaseRecord> & { file_name: string; content: string }) {
  return apiFetch<CaseRecord>("/admin/cases", {
    method: "POST",
    auth: true,
    body: JSON.stringify(payload),
  });
}

export function adminUpdateCase(caseId: number, payload: Partial<CaseRecord>) {
  return apiFetch<CaseRecord>(`/admin/cases/${caseId}`, {
    method: "PUT",
    auth: true,
    body: JSON.stringify(payload),
  });
}

export function adminDeleteCase(caseId: number) {
  return apiFetch<{ success: boolean }>(`/admin/cases/${caseId}`, {
    method: "DELETE",
    auth: true,
  });
}

export async function adminUploadCase(file: File) {
  const session = readSession();
  const accessToken = session.tokens?.access_token;
  if (!accessToken) {
    throw new Error("Требуется авторизация.");
  }
  const body = new FormData();
  body.append("file", file);
  const response = await fetch(`${API_BASE_URL}/admin/cases/upload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body,
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return (await response.json()) as CaseRecord;
}
