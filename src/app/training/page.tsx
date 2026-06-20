"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { EMPLOYEE_PROFILES, EMPLOYEE_LIST, type EmployeeType, type Difficulty } from "@/lib/employee-types";
import { TRAINING_STEPS } from "@/lib/training-steps";

export default function TrainingSetupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedType, setSelectedType] = useState<EmployeeType | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [userName, setUserName] = useState("");
  const [creating, setCreating] = useState(false);
  const [ragEnabled, setRagEnabled] = useState(false);

  useEffect(() => {
    const typeParam = searchParams.get("type") as EmployeeType | null;
    if (typeParam && EMPLOYEE_PROFILES[typeParam]) {
      setSelectedType(typeParam);
    }
  }, [searchParams]);

  const handleStart = async () => {
    if (!selectedType) return;
    setCreating(true);

    try {
      const profile = EMPLOYEE_PROFILES[selectedType];
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_name: userName || "练习管理者",
          employee_type: profile.type,
          employee_name: profile.name,
          difficulty,
          rag_enabled: ragEnabled,
          scenario: `${profile.title} - ${difficulty}模式`,
        }),
      });

      if (!res.ok) throw new Error("创建会话失败");
      const json = await res.json();
      const sessionId = json.data?.id;
      if (sessionId) {
        router.push(`/training/session?id=${sessionId}`);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "创建失败");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8">
        <h1 className="mb-2 text-2xl font-bold text-foreground">训练设置</h1>
        <p className="text-sm text-muted-foreground">选择对话角色和难度，开始绩效面谈模拟训练</p>
      </div>

      {/* Step 1: Select Employee Type */}
      <section className="mb-8">
        <div className="mb-3 flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">1</span>
          <h2 className="text-sm font-semibold text-foreground">选择 AI 模拟角色</h2>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {EMPLOYEE_LIST.map((emp) => (
            <button
              key={emp.type}
              onClick={() => setSelectedType(emp.type)}
              className={`relative overflow-hidden rounded-xl border-2 p-4 text-left transition-all ${
                selectedType === emp.type
                  ? "border-primary bg-primary/5"
                  : "border-border bg-card hover:border-primary/30"
              }`}
            >
              {selectedType === emp.type && (
                <div className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
              <div className="mb-3 flex items-center gap-3">
                <div className={`flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br ${emp.avatarGradient} text-base font-medium text-white`}>
                  {emp.name.charAt(0)}
                </div>
                <div>
                  <div className="text-sm font-semibold text-foreground">{emp.name}</div>
                  <div className="text-xs text-muted-foreground">{emp.title}</div>
                </div>
              </div>
              <p className="mb-2 text-xs leading-relaxed text-muted-foreground">{emp.description}</p>
              <div className="flex flex-wrap gap-1">
                {emp.personalityTraits.map((trait) => (
                  <span key={trait} className="rounded bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground">
                    {trait}
                  </span>
                ))}
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Step 2: Difficulty & Options */}
      <section className="mb-8">
        <div className="mb-3 flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">2</span>
          <h2 className="text-sm font-semibold text-foreground">训练配置</h2>
        </div>
        <div className="rounded-xl border border-border/60 bg-card p-4 space-y-4">
          {/* User Name */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">您的姓名（可选）</label>
            <input
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="练习管理者"
              className="w-full max-w-xs rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {/* Difficulty */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">难度等级</label>
            <div className="flex gap-2">
              {([
                { value: "easy", label: "简单", desc: "员工配合度较高" },
                { value: "medium", label: "中等", desc: "标准挑战" },
                { value: "hard", label: "困难", desc: "员工反应强烈" },
              ] as const).map((d) => (
                <button
                  key={d.value}
                  onClick={() => setDifficulty(d.value)}
                  className={`flex-1 rounded-lg border-2 p-3 text-left transition-all ${
                    difficulty === d.value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/30"
                  }`}
                >
                  <div className="text-sm font-medium text-foreground">{d.label}</div>
                  <div className="text-[10px] text-muted-foreground">{d.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* RAG Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-foreground">RAG 知识库增强</div>
              <div className="text-xs text-muted-foreground">启用后将检索公司话术库和案例，提供更贴合实际的对话</div>
            </div>
            <button
              onClick={() => setRagEnabled(!ragEnabled)}
              className={`relative h-6 w-11 rounded-full transition-colors ${ragEnabled ? "bg-primary" : "bg-muted"}`}
            >
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${ragEnabled ? "translate-x-5" : "translate-x-0.5"}`} />
            </button>
          </div>
        </div>
      </section>

      {/* Step 3: Training Flow Preview */}
      <section className="mb-8">
        <div className="mb-3 flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">3</span>
          <h2 className="text-sm font-semibold text-foreground">训练流程预览</h2>
        </div>
        <div className="rounded-xl border border-border/60 bg-card p-4">
          <div className="flex flex-wrap items-center gap-2">
            {TRAINING_STEPS.map((step, idx) => (
              <div key={step.step} className="flex items-center gap-2">
                <div className="flex items-center gap-2 rounded-lg bg-secondary/50 px-3 py-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded bg-primary/10 text-[10px] font-bold text-primary">
                    {step.step}
                  </span>
                  <span className="text-xs font-medium text-foreground">{step.title}</span>
                </div>
                {idx < TRAINING_STEPS.length - 1 && (
                  <svg className="h-4 w-4 text-muted-foreground/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                )}
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            每个阶段结束后，系统将自动分析您的面谈表现，给出评分和改进建议。完成全部四步后生成总结报告。
          </p>
        </div>
      </section>

      {/* Start Button */}
      <div className="sticky bottom-4">
        <button
          onClick={handleStart}
          disabled={!selectedType || creating}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {creating ? (
            <>
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              创建训练会话...
            </>
          ) : (
            <>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {selectedType ? `开始与 ${EMPLOYEE_PROFILES[selectedType].name} 的面谈` : "请先选择角色"}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
