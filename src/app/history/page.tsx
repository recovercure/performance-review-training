"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { EMPLOYEE_PROFILES, type EmployeeType } from "@/lib/employee-types";
import { cn } from "@/lib/utils";

interface SessionRecord {
  id: string;
  user_name: string;
  employee_name: string;
  employee_type: string;
  difficulty: string;
  status: string;
  overall_score: string | null;
  current_step: number;
  created_at: string;
  summary: string | null;
  rag_enabled: boolean;
}

interface SessionSummaryData {
  overallScore?: number;
  summary?: string;
  strengths?: string[];
  weaknesses?: string[];
  growthPath?: string[];
  recommendedFocus?: string;
}

export default function HistoryPage() {
  const searchParams = useSearchParams();
  const queryId = searchParams.get("id");

  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<SessionRecord | null>(null);
  const [sessionDetail, setSessionDetail] = useState<Record<string, unknown> | null>(null);
  const [filter, setFilter] = useState<"all" | "completed" | "in_progress">("all");

  useEffect(() => {
    fetchSessions();
  }, []);

  useEffect(() => {
    if (queryId && sessions.length > 0) {
      const s = sessions.find((s) => s.id === queryId);
      if (s) {
        handleSelect(s);
      }
    }
  }, [queryId, sessions]);

  const fetchSessions = async () => {
    try {
      const res = await fetch("/api/sessions?limit=50");
      if (!res.ok) throw new Error("加载失败");
      const json = await res.json();
      setSessions(json.data || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = async (s: SessionRecord) => {
    setSelectedSession(s);
    setSessionDetail(null);
    try {
      const res = await fetch(`/api/sessions/${s.id}`);
      if (res.ok) {
        const json = await res.json();
        setSessionDetail(json.data);
      }
    } catch {
      // ignore
    }
  };

  const filteredSessions = sessions.filter((s) => {
    if (filter === "all") return true;
    if (filter === "completed") return s.status === "completed";
    return s.status !== "completed";
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">历史记录与复盘</h1>
          <p className="mt-1 text-sm text-muted-foreground">回顾训练记录，追踪技巧提升轨迹</p>
        </div>
      </div>

      {/* Filter */}
      <div className="mb-4 flex gap-2">
        {([
          { value: "all", label: "全部" },
          { value: "completed", label: "已完成" },
          { value: "in_progress", label: "进行中" },
        ] as const).map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
              filter === f.value
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:bg-muted"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Session List */}
        <div className="lg:col-span-1">
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-20 animate-pulse rounded-lg bg-muted" />
              ))}
            </div>
          ) : filteredSessions.length > 0 ? (
            <div className="space-y-2">
              {filteredSessions.map((s) => {
                const profile = EMPLOYEE_PROFILES[s.employee_type as EmployeeType];
                return (
                  <button
                    key={s.id}
                    onClick={() => handleSelect(s)}
                    className={cn(
                      "w-full overflow-hidden rounded-xl border-2 p-3 text-left transition-all",
                      selectedSession?.id === s.id
                        ? "border-primary bg-primary/5"
                        : "border-border bg-card hover:border-primary/30"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-xs font-medium text-white",
                        profile?.avatarGradient || "from-gray-400 to-gray-600"
                      )}>
                        {s.employee_name.charAt(0)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-medium text-foreground">{s.employee_name}</span>
                          <span className={cn(
                            "shrink-0 rounded px-1.5 py-0.5 text-[10px]",
                            s.status === "completed"
                              ? "bg-green-500/10 text-green-600"
                              : "bg-blue-500/10 text-blue-600"
                          )}>
                            {s.status === "completed" ? "已完成" : "进行中"}
                          </span>
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          {new Date(s.created_at).toLocaleString("zh-CN", { dateStyle: "short", timeStyle: "short" })}
                        </div>
                      </div>
                      {s.overall_score && (
                        <div className="shrink-0 text-right">
                          <div className="text-lg font-bold tabular-nums text-primary">{s.overall_score}</div>
                          <div className="text-[9px] text-muted-foreground">分</div>
                        </div>
                      )}
                    </div>
                    <div className="mt-1.5 flex items-center gap-2 text-[10px] text-muted-foreground">
                      <span>{s.difficulty}</span>
                      <span>·</span>
                      <span>第{s.current_step}/4步</span>
                      {s.rag_enabled && (
                        <>
                          <span>·</span>
                          <span className="text-primary">RAG</span>
                        </>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card/50 py-12">
              <svg className="mb-3 h-10 w-10 text-muted-foreground/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              <p className="text-sm text-muted-foreground">暂无训练记录</p>
            </div>
          )}
        </div>

        {/* Detail Panel */}
        <div className="lg:col-span-2">
          {selectedSession ? (
            <SessionDetail session={selectedSession} detail={sessionDetail} />
          ) : (
            <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50">
              <svg className="mb-3 h-12 w-12 text-muted-foreground/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2a4 4 0 014-4h2a4 4 0 014 4v2M9 7h6m-6 4h6m-9 8h12a2 2 0 002-2V5a2 2 0 00-2-2H6a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <p className="text-sm text-muted-foreground">选择左侧记录查看详细复盘</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SessionDetail({ session, detail }: { session: SessionRecord; detail: Record<string, unknown> | null }) {
  const profile = EMPLOYEE_PROFILES[session.employee_type as EmployeeType];
  const messages = (detail?.messages as Array<{ role: string; content: string; step: number }>) || [];
  const analytics = (detail?.analytics as Array<{ step: number; score: number; highlights: string[]; improvements: string[] }>) || [];
  const summary = session.summary ? (() => { try { return JSON.parse(session.summary) as SessionSummaryData; } catch { return null; } })() : null;

  const DIMENSION_LABELS: Record<string, string> = {
    opening: "开场破冰", questioning: "提问诊断", feedback: "反馈沟通",
    emotion: "情绪管理", goal: "目标设定", listening: "倾听共情",
  };

  return (
    <div className="rounded-xl border border-border/60 bg-card p-4">
      {/* Header */}
      <div className="mb-4 flex items-center gap-3 border-b border-border/60 pb-4">
        <div className={cn("flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br text-base font-medium text-white", profile?.avatarGradient || "from-gray-400 to-gray-600")}>
          {session.employee_name.charAt(0)}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-foreground">与 {session.employee_name} 的面谈</h2>
            <span className={cn(
              "rounded px-1.5 py-0.5 text-[10px]",
              session.status === "completed" ? "bg-green-500/10 text-green-600" : "bg-blue-500/10 text-blue-600"
            )}>
              {session.status === "completed" ? "已完成" : "进行中"}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            {profile?.title || session.employee_type} · {session.difficulty} · {new Date(session.created_at).toLocaleString("zh-CN")}
          </p>
        </div>
        {session.overall_score && (
          <div className="text-right">
            <div className="text-2xl font-bold tabular-nums text-primary">{session.overall_score}</div>
            <div className="text-[10px] text-muted-foreground">综合得分</div>
          </div>
        )}
      </div>

      {/* Summary */}
      {summary && (
        <div className="mb-4 rounded-lg border border-primary/20 bg-primary/5 p-3">
          <div className="mb-1.5 text-xs font-semibold text-primary">训练总结</div>
          {summary.summary && <p className="mb-2 text-sm text-foreground">{summary.summary}</p>}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {summary.strengths && summary.strengths.length > 0 && (
              <div>
                <div className="text-[10px] font-medium text-green-600">核心优势</div>
                <ul className="mt-0.5 space-y-0.5">
                  {summary.strengths.map((s, i) => (
                    <li key={i} className="text-xs text-foreground">• {s}</li>
                  ))}
                </ul>
              </div>
            )}
            {summary.weaknesses && summary.weaknesses.length > 0 && (
              <div>
                <div className="text-[10px] font-medium text-amber-600">待提升</div>
                <ul className="mt-0.5 space-y-0.5">
                  {summary.weaknesses.map((w, i) => (
                    <li key={i} className="text-xs text-foreground">• {w}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          {summary.growthPath && summary.growthPath.length > 0 && (
            <div className="mt-2">
              <div className="text-[10px] font-medium text-primary">成长建议</div>
              <ul className="mt-0.5 space-y-0.5">
                {summary.growthPath.map((g, i) => (
                  <li key={i} className="text-xs text-foreground">{i + 1}. {g}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Step Scores */}
      {analytics.length > 0 && (
        <div className="mb-4">
          <h3 className="mb-2 text-xs font-semibold text-muted-foreground">各阶段分析</h3>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {analytics.map((a) => (
              <div key={a.step} className="rounded-lg border border-border/60 bg-background p-2 text-center">
                <div className="text-[10px] text-muted-foreground">第{a.step}步</div>
                <div className="text-lg font-bold tabular-nums text-primary">{a.score}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Conversation Replay */}
      {messages.length > 0 && (
        <div>
          <h3 className="mb-2 text-xs font-semibold text-muted-foreground">对话回放</h3>
          <div className="max-h-[400px] space-y-2 overflow-y-auto scrollbar-thin rounded-lg border border-border/60 bg-background p-3">
            {messages.map((msg, idx) => {
              const isManager = msg.role === "user";
              return (
                <div key={idx} className={cn("flex", isManager ? "justify-end" : "justify-start")}>
                  <div className={cn(
                    "max-w-[80%] rounded-xl px-3 py-2 text-sm",
                    isManager
                      ? "rounded-tr-sm bg-primary text-primary-foreground"
                      : "rounded-tl-sm bg-card border border-border text-foreground"
                  )}>
                    <div className="mb-0.5 text-[9px] text-muted-foreground/70">
                      {isManager ? "管理者" : session.employee_name} · 第{msg.step}步
                    </div>
                    <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Analysis Details */}
      {analytics.length > 0 && (
        <div className="mt-4">
          <h3 className="mb-2 text-xs font-semibold text-muted-foreground">分析详情</h3>
          <div className="space-y-2">
            {analytics.map((a) => (
              <div key={a.step} className="rounded-lg border border-border/60 bg-background p-3">
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-xs font-medium text-foreground">第{a.step}步分析</span>
                  <span className="text-sm font-bold tabular-nums text-primary">{a.score}分</span>
                </div>
                {a.highlights && a.highlights.length > 0 && (
                  <div className="mb-1">
                    <span className="text-[10px] text-green-600">亮点: </span>
                    <span className="text-xs text-foreground">{a.highlights.join("；")}</span>
                  </div>
                )}
                {a.improvements && a.improvements.length > 0 && (
                  <div>
                    <span className="text-[10px] text-amber-600">改进: </span>
                    <span className="text-xs text-foreground">{a.improvements.join("；")}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
