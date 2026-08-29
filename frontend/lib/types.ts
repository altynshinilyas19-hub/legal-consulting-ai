export type TokenPair = {
  access_token: string;
  refresh_token: string;
  token_type: "bearer";
};

export type User = {
  id: number;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: "user" | "admin";
  is_active: boolean;
  is_blocked: boolean;
  created_at: string;
};

export type AuthResponse = {
  user: User;
  tokens: TokenPair;
};

export type FavoriteTargetType = "case" | "lawyer" | "article";

export type Favorite = {
  id: string;
  target_type: FavoriteTargetType;
  target_id: string;
  created_at: string;
};

export type CaseSnippet = {
  id: number;
  file_name: string;
  snippet: string;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  meta: {
    keywords?: string[];
    cases?: CaseSnippet[];
    cases_found?: number;
  };
  created_at: string;
};

export type Chat = {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  messages: ChatMessage[];
};

export type ChatSummary = {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  preview: string | null;
  messages_count: number;
};

export type ConsultResponse = {
  answer: string;
  cases: CaseSnippet[];
  keywords: string[];
  cases_found: number;
};

export type StreamDonePayload = ConsultResponse & {
  chat_id?: string;
  user_message?: ChatMessage;
  assistant_message?: ChatMessage;
};

export type CaseRecord = {
  id: number;
  file_name: string;
  title: string | null;
  case_number: string | null;
  court_name: string | null;
  category: string | null;
  region: string | null;
  source_url: string | null;
  decision_date: string | null;
  excerpt: string | null;
  content: string;
  case_metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type LawyerRecord = {
  id: number;
  name: string;
  photo_url: string | null;
  specialization: string;
  description: string;
  experience_years: number;
  rating: number;
  contacts: Record<string, string>;
  consultation_price: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type ArticleRecord = {
  id: number;
  title: string;
  slug: string;
  kind: string;
  excerpt: string | null;
  content: string;
  cover_image: string | null;
  is_published: boolean;
  published_at: string | null;
  author_id: number | null;
  created_at: string;
  updated_at: string;
};

export type PaginatedResponse<T> = {
  items: T[];
  total: number;
  page: number;
  page_size: number;
};

export type AdminOverview = {
  users_total: number;
  blocked_users: number;
  chats_total: number;
  messages_total: number;
  ai_requests_total: number;
  cases_total: number;
  lawyers_total: number;
  articles_total: number;
  admin_logs_total: number;
};

export type AdminLog = {
  id: string;
  admin_id: number | null;
  action: string;
  target_type: string;
  target_id: string | null;
  payload: Record<string, unknown>;
  created_at: string;
};

export type AdminUserRow = {
  id: number;
  email: string;
  full_name: string | null;
  role: "user" | "admin";
  is_active: boolean;
  is_blocked: boolean;
  created_at: string;
};

export type SessionState = {
  user: User | null;
  tokens: TokenPair | null;
};
