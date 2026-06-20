import { randomUUID } from "crypto";

interface Session {
  id: string;
  user_id: string;
  user_name: string;
  employee_type: string;
  employee_name: string;
  scenario: string | null;
  difficulty: string;
  current_step: number;
  status: string;
  overall_score: number | null;
  summary: string | null;
  rag_enabled: boolean;
  messages: Array<{ role: string; content: string; step: number }>;
  analytics: Array<{ step: number; score: number; highlights: string[]; improvements: string[]; dimensions: Record<string, number> }>;
  created_at: string;
  updated_at: string;
}

const sessions = new Map<string, Session>();

export function isSupabaseConfigured(): boolean {
  return !!(process.env.SUPABASE_URL || process.env.COZE_SUPABASE_URL);
}

export function createSession(data: {
  user_id?: string;
  user_name?: string;
  employee_type: string;
  employee_name: string;
  scenario?: string;
  difficulty?: string;
  rag_enabled?: boolean;
}): Session {
  const now = new Date().toISOString();
  const session: Session = {
    id: randomUUID(),
    user_id: data.user_id || "demo_user",
    user_name: data.user_name || "练习管理者",
    employee_type: data.employee_type,
    employee_name: data.employee_name,
    scenario: data.scenario || null,
    difficulty: data.difficulty || "medium",
    current_step: 1,
    status: "in_progress",
    overall_score: null,
    summary: null,
    rag_enabled: data.rag_enabled ?? false,
    messages: [],
    analytics: [],
    created_at: now,
    updated_at: now,
  };
  sessions.set(session.id, session);
  return session;
}

export function getSession(id: string): Session | undefined {
  return sessions.get(id);
}

export function listSessions(userId: string, limit = 20, offset = 0): { data: Session[]; total: number } {
  const userSessions = Array.from(sessions.values())
    .filter((s) => s.user_id === userId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));

  return {
    data: userSessions.slice(offset, offset + limit),
    total: userSessions.length,
  };
}

export function updateSession(id: string, updates: Partial<Session>): Session | undefined {
  const session = sessions.get(id);
  if (!session) return undefined;

  if (updates.messages) {
    session.messages = [...session.messages, ...updates.messages];
  }
  if (updates.analytics) {
    session.analytics = [...session.analytics, ...updates.analytics];
  }
  if (updates.current_step !== undefined) session.current_step = updates.current_step;
  if (updates.status !== undefined) session.status = updates.status;
  if (updates.overall_score !== undefined) session.overall_score = updates.overall_score;
  if (updates.summary !== undefined) session.summary = updates.summary;

  session.updated_at = new Date().toISOString();
  return session;
}
