"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { TRAINING_STEPS } from "@/lib/training-steps";
import { EMPLOYEE_LIST } from "@/lib/employee-types";

interface DashboardStats {
  totalSessions: number;
  completedSessions: number;
  avgScore: number;
  recentSessions: Array<{
    id: string;
    employee_name: string;
    employee_type: string;
    overall_score: string | null;
    status: string;
    created_at: string;
  }>;
}

export default function HomePage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalSessions: 0,
    completedSessions: 0,
    avgScore: 0,
    recentSessions: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/sessions?limit=5");
      if (res.ok) {
        const json = await res.json();
        const sessions = json.data || [];
        const completed = sessions.filter((s: { status: string }) => s.status === "completed");
        const scores = completed
          .map((s: { overall_score: string | null }) => parseFloat(s.overall_score || "0"))
          .filter((s: number) => s > 0);
        const avg = scores.length > 0 ? scores.reduce((a: number, b: number) => a + b, 0) / scores.length : 0;

        setStats({
          totalSessions: json.total || 0,
          completedSessions: completed.length,
          avgScore: Math.round(avg),
          recentSessions: sessions.slice(0, 5),
        });
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Hero Section */}
      <section className="mb-10 animate-fade-in">
        <div className="flex flex-col gap-4">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-border/60 bg-secondary/50 px-3 py-1 text-xs text-muted-foreground">
            <span className="flex h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            企业微信集成 · AI 角色扮演
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            在真实对话中
            <br />
            <span className="text-primary">磨砺面谈技巧</span>
          </h1>
          <p className="max-w-2xl text-base leading-relaxed text-muted-foreground">
            通过 AI 模拟不同类型员工的绩效面谈场景，结合四步法引导式训练，
            <br className="hidden sm:inline" />
            实时分析沟通表现，帮助管理者在安全环境中反复练习、持续提升。
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              href="/training"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-all hover:opacity-90 active:scale-[0.98]"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              开始训练
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="mb-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          label="练习总数"
          value={loading ? "--" : stats.totalSessions.toString()}
          unit="次"
          icon="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
        />
        <StatCard
          label="已完成"
          value={loading ? "--" : stats.completedSessions.toString()}
          unit="次"
          icon="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
        />
        <StatCard
          label="平均得分"
          value={loading ? "--" : stats.avgScore.toString()}
          unit="分"
          icon="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.196-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
        />
        <StatCard
          label="技能等级"
          value={loading ? "--" : getSkillLevel(stats.avgScore)}
          unit=""
          icon="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
        />
      </section>

      {/* Four Steps Section */}
      <section className="mb-10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">四步法训练流程</h2>
          <span className="text-xs text-muted-foreground">引导式 · 结构化 · 可追踪</span>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {TRAINING_STEPS.map((step, idx) => (
            <div
              key={step.step}
              className="group relative overflow-hidden rounded-xl border border-border/60 bg-card p-4 transition-all hover:border-primary/30 hover:shadow-sm"
              style={{ animationDelay: `${idx * 80}ms` }}
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-xs font-bold text-primary">
                  {step.step}
                </span>
                <span className="text-[10px] text-muted-foreground">{step.duration}</span>
              </div>
              <h3 className="mb-1 text-sm font-semibold text-foreground">{step.title}</h3>
              <p className="mb-2 text-xs leading-relaxed text-muted-foreground">{step.description}</p>
              <div className="flex flex-wrap gap-1">
                {step.keyTechniques.map((tech) => (
                  <span key={tech} className="rounded bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground">
                    {tech}
                  </span>
                ))}
              </div>
              {idx < TRAINING_STEPS.length - 1 && (
                <div className="absolute right-0 top-1/2 hidden h-px w-3 -translate-y-1/2 translate-x-full bg-border lg:block" />
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Employee Roles + Recent Sessions */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Employee Roles */}
        <div>
          <h2 className="mb-4 text-lg font-semibold text-foreground">AI 模拟角色</h2>
          <div className="space-y-2">
            {EMPLOYEE_LIST.map((emp) => (
              <Link
                key={emp.type}
                href={`/training?type=${emp.type}`}
                className="flex items-center gap-3 rounded-lg border border-border/60 bg-card p-3 transition-all hover:border-primary/30 hover:shadow-sm"
              >
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${emp.avatarGradient} text-sm font-medium text-white`}>
                  {emp.name.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{emp.name}</span>
                    <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground">{emp.title}</span>
                  </div>
                  <p className="truncate text-xs text-muted-foreground">{emp.description}</p>
                </div>
                <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] ${
                  emp.difficulty === "hard" ? "bg-red-500/10 text-red-600" :
                  emp.difficulty === "medium" ? "bg-amber-500/10 text-amber-600" :
                  "bg-green-500/10 text-green-600"
                }`}>
                  {emp.challengeLevel}
                </span>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Sessions */}
        <div>
          <h2 className="mb-4 text-lg font-semibold text-foreground">最近练习</h2>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
              ))}
            </div>
          ) : stats.recentSessions.length > 0 ? (
            <div className="space-y-2">
              {stats.recentSessions.map((s) => (
                <Link
                  key={s.id}
                  href={`/history?id=${s.id}`}
                  className="flex items-center gap-3 rounded-lg border border-border/60 bg-card p-3 transition-all hover:border-primary/30 hover:shadow-sm"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">与 {s.employee_name} 的面谈</span>
                      <span className={`rounded px-1.5 py-0.5 text-[10px] ${
                        s.status === "completed" ? "bg-green-500/10 text-green-600" : "bg-blue-500/10 text-blue-600"
                      }`}>
                        {s.status === "completed" ? "已完成" : "进行中"}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(s.created_at).toLocaleString("zh-CN", { dateStyle: "short", timeStyle: "short" })}
                    </p>
                  </div>
                  {s.overall_score && (
                    <div className="shrink-0 text-right">
                      <div className="text-lg font-bold tabular-nums text-primary">{s.overall_score}</div>
                      <div className="text-[10px] text-muted-foreground">总分</div>
                    </div>
                  )}
                </Link>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card/50 py-12">
              <svg className="mb-3 h-10 w-10 text-muted-foreground/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2a4 4 0 014-4h2a4 4 0 014 4v2M9 7h6m-6 4h6m-9 8h12a2 2 0 002-2V5a2 2 0 00-2-2H6a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <p className="text-sm text-muted-foreground">还没有练习记录</p>
              <Link href="/training" className="mt-3 text-sm font-medium text-primary hover:underline">
                开始第一次训练 →
              </Link>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function StatCard({ label, value, unit, icon }: { label: string; value: string; unit: string; icon: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <svg className="h-4 w-4 text-muted-foreground/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
        </svg>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-bold tabular-nums text-foreground">{value}</span>
        {unit && <span className="text-xs text-muted-foreground">{unit}</span>}
      </div>
    </div>
  );
}

function getSkillLevel(score: number): string {
  if (score >= 90) return "优秀";
  if (score >= 75) return "良好";
  if (score >= 60) return "合格";
  if (score > 0) return "待提升";
  return "未评级";
}
