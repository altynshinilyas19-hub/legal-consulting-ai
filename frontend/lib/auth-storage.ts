import type { SessionState, TokenPair, User } from "@/lib/types";

const STORAGE_KEY = "lexharbor.session";

export function readSession(): SessionState {
  if (typeof window === "undefined") {
    return { user: null, tokens: null };
  }
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return { user: null, tokens: null };
  }
  try {
    return JSON.parse(raw) as SessionState;
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
    return { user: null, tokens: null };
  }
}

export function writeSession(user: User, tokens: TokenPair) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ user, tokens }));
}

export function updateTokens(tokens: TokenPair) {
  const current = readSession();
  if (current.user) {
    writeSession(current.user, tokens);
  }
}

export function clearSession() {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.removeItem(STORAGE_KEY);
}

export function updateUser(user: User) {
  const current = readSession();
  if (current.tokens) {
    writeSession(user, current.tokens);
  }
}
