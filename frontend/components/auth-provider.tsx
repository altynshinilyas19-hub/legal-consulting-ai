"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";

import { clearSession, readSession, updateUser as persistUser, writeSession } from "@/lib/auth-storage";
import { getMe, login, logout, register } from "@/lib/api";
import type { AuthResponse, SessionState, User } from "@/lib/types";

type AuthContextValue = {
  user: User | null;
  tokens: SessionState["tokens"];
  loading: boolean;
  isAdmin: boolean;
  signIn: (payload: { email: string; password: string }) => Promise<AuthResponse>;
  signUp: (payload: { email: string; password: string; full_name?: string }) => Promise<AuthResponse>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [{ user, tokens }, setState] = useState<SessionState>({ user: null, tokens: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const bootstrap = async () => {
      const session = readSession();
      if (!session.tokens) {
        setLoading(false);
        return;
      }

      setState(session);
      try {
        const profile = await getMe();
        persistUser(profile);
        setState({ user: profile, tokens: readSession().tokens });
      } catch {
        clearSession();
        setState({ user: null, tokens: null });
      } finally {
        setLoading(false);
      }
    };

    void bootstrap();
  }, []);

  const handleAuth = (payload: AuthResponse) => {
    writeSession(payload.user, payload.tokens);
    setState({ user: payload.user, tokens: payload.tokens });
    return payload;
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      tokens,
      loading,
      isAdmin: user?.role === "admin",
      signIn: async (payload) => handleAuth(await login(payload)),
      signUp: async (payload) => handleAuth(await register(payload)),
      signOut: async () => {
        await logout();
        setState({ user: null, tokens: null });
        router.push("/login");
      },
      refreshUser: async () => {
        const profile = await getMe();
        persistUser(profile);
        setState({ user: profile, tokens: readSession().tokens });
      },
    }),
    [user, tokens, loading, router],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
