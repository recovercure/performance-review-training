"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { TRAINING_STEPS, STEP_GUIDE_PROMPTS } from "@/lib/training-steps";
import { EMPLOYEE_PROFILES, type EmployeeType, type Difficulty } from "@/lib/employee-types";
import { cn } from "@/lib/utils";

interface ChatMessage {
  role: "manager" | "employee";
  content: string;
  step: number;
}

interface AnalysisResult {
  score: number;
  dimensions: Record<string, number>;
  highlights: string[];
  improvements: string[];
  suggestion: string;
  employeeMood: string;
  techniqueUsed: string[];
}

const DIMENSION_LABELS: Record<string, string> = {
  opening: "开场破冰",
  questioning: "提问诊断",
  feedback: "反馈沟通",
  emotion: "情绪管理",
  goal: "目标设定",
  listening: "倾听共情",
};

export default function TrainingSessionPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get("id");

  const [session, setSession] = useState<{
    id: string;
    employee_type: string;
    employee_name: string;
    difficulty: string;
    current_step: number;
    status: string;
    rag_enabled: boolean;
  } | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [currentStep, setCurrentStep] = useState(1);
  const [analyses, setAnalyses] = useState<Record<number, AnalysisResult>>({});
  const [analyzing, setAnalyzing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showSummary, setShowSummary] = useState(false);
  const [summary, setSummary] = useState<Record<string, unknown> | null>(null);
  const [generatingSummary, setGeneratingSummary] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesRef = useRef<ChatMessage[]>([]);

  messagesRef.current = messages;

  useEffect(() => {
    if (sessionId) {
      fetchSession();
    } else {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  const fetchSession = async () => {
    try {
      const res = await fetch(`/api/sessions/${sessionId}`);
      if (!res.ok) throw new Error("加载失败");
      const json = await res.json();
      const s = json.data;
      setSession(s);
      setCurrentStep(s.current_step);

      if (s.messages && s.messages.length > 0) {
        const loadedMsgs: ChatMessage[] = s.messages.map((m: { role: string; content: string; step: number }) => ({
          role: m.role === "user" ? "manager" : "employee",
          content: m.content,
          step: m.step,
        }));
        setMessages(loadedMsgs);
      }

      if (s.analytics && s.analytics.length > 0) {
        const analyticsMap: Record<number, AnalysisResult> = {};
        for (const a of s.analytics) {
          analyticsMap[a.step] = {
            score: parseFloat(a.score),
            dimensions: a.dimensions || {},
            highlights: a.highlights || [],
            improvements: a.improvements || [],
            suggestion: "",
            employeeMood: "",
            techniqueUsed: [],
          };
        }
        setAnalyses(analyticsMap);
      }

      if (s.status === "completed") {
        setShowSummary(true);
        if (s.summary) {
          try {
            setSummary(JSON.parse(s.summary));
          } catch {
            // not JSON
          }
        }
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "加载会话失败");
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || streaming || !session) return;
    const msg = input.trim();
    setInput("");
    setStreaming(true);
    setStreamingContent("");

    const newMessage: ChatMessage = { role: "manager", content: msg, step: currentStep };
    const updatedMessages = [...messages, newMessage];
    setMessages(updatedMessages);

    try {
      // Build conversation history for LLM
      const llmMessages = updatedMessages.map((m) => ({
        role: m.role === "manager" ? "user" : "assistant",
        content: m.content,
      }));

      const res = await fetch("/api/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: llmMessages,
          employeeType: session.employee_type as EmployeeType,
          employeeName: session.employee_name,
          step: currentStep,
          difficulty: session.difficulty as Difficulty,
          ragEnabled: session.rag_enabled,
        }),
      });

      if (!res.ok) throw new Error("对话请求失败");

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = "";

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value);
        const lines = text.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ") && line !== "data: [DONE]") {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.content) {
                fullContent += data.content;
                setStreamingContent(fullContent);
              }
              if (data.error) {
                console.error("Stream error:", data.error);
              }
            } catch {
              // ignore parse errors
            }
          }
        }
      }

      if (fullContent) {
        const employeeMsg: ChatMessage = {
          role: "employee",
          content: fullContent,
          step: currentStep,
        };
        setMessages((prev) => [...prev, employeeMsg]);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "发送失败");
    } finally {
      setStreaming(false);
      setStreamingContent("");
      inputRef.current?.focus();
    }
  };

  const runAnalysis = async () => {
    if (!session || analyzing) return;
    setAnalyzing(true);

    try {
      const stepMessages = messages
        .filter((m) => m.step === currentStep)
        .map((m) => ({ role: m.role === "manager" ? "user" : "assistant", content: m.content }));

      if (stepMessages.length === 0) {
        alert("当前阶段还没有对话记录");
        setAnalyzing(false);
        return;
      }

      const res = await fetch("/api/analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: stepMessages,
          employeeType: session.employee_type as EmployeeType,
          step: currentStep,
          ragEnabled: session.rag_enabled,
        }),
      });

      if (!res.ok) throw new Error("分析请求失败");
      const json = await res.json();
      const result = json.data as AnalysisResult;

      setAnalyses((prev) => ({ ...prev, [currentStep]: result }));

      // Save analysis to session
      await fetch(`/api/sessions/${sessionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          analytics: [{
            step: currentStep,
            score: result.score,
            highlights: result.highlights,
            improvements: result.improvements,
            dimensions: result.dimensions,
          }],
        }),
      });
    } catch (err) {
      alert(err instanceof Error ? err.message : "分析失败");
    } finally {
      setAnalyzing(false);
    }
  };

  const nextStep = async () => {
    if (!session || currentStep >= 4) return;
    const next = currentStep + 1;
    setCurrentStep(next);

    // Save all messages and update step
    await fetch(`/api/sessions/${sessionId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        current_step: next,
        messages: messages
          .filter((m) => m.step === currentStep)
          .map((m) => ({
            role: m.role === "manager" ? "user" : "assistant",
            content: m.content,
            step: m.step,
          })),
      }),
    });
  };

  const finishSession = async () => {
    if (!session || generatingSummary) return;
    setGeneratingSummary(true);

    try {
      // Save remaining messages
      await fetch(`/api/sessions/${sessionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: messages
            .filter((m) => m.step === currentStep)
            .map((m) => ({
              role: m.role === "manager" ? "user" : "assistant",
              content: m.content,
              step: m.step,
            })),
        }),
      });

      // Calculate overall score
      const scores = Object.values(analyses).map((a) => a.score);
      const overall = scores.length > 0
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : 0;

      // Generate summary using LLM
      const summaryRes = await fetch("/api/analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: "生成总结报告" }],
          employeeType: session.employee_type as EmployeeType,
          step: 5,
          ragEnabled: session.rag_enabled,
          stepScores: scores,
          mode: "summary",
        }),
      });

      let summaryData: Record<string, unknown> | null = null;
      if (summaryRes.ok) {
        const json = await summaryRes.json();
        summaryData = json.data;
      }

      // Update session status
      await fetch(`/api/sessions/${sessionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "completed",
          overall_score: overall,
          summary: summaryData ? JSON.stringify(summaryData) : null,
        }),
      });

      setSummary(summaryData);
      setShowSummary(true);
    } catch (err) {
      alert(err instanceof Error ? err.message : "完成失败");
    } finally {
      setGeneratingSummary(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-3.5rem)] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <svg className="h-8 w-8 animate-spin text-primary" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-sm text-muted-foreground">加载训练会话...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex h-[calc(100vh-3.5rem)] items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">未找到训练会话</p>
          <button onClick={() => router.push("/training")} className="mt-3 text-sm text-primary hover:underline">
            返回训练设置 →
          </button>
        </div>
      </div>
    );
  }

  const profile = EMPLOYEE_PROFILES[session.employee_type as EmployeeType];
  const currentStepInfo = TRAINING_STEPS[currentStep - 1];
  const currentAnalysis = analyses[currentStep];

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col overflow-hidden">
      {/* Step Progress Bar */}
      <div className="border-b border-border/60 bg-card px-4 py-3">
        <div className="mx-auto flex max-w-5xl items-center gap-2">
          {TRAINING_STEPS.map((step, idx) => (
            <div key={step.step} className="flex flex-1 items-center gap-2">
              <button
                onClick={() => step.step <= currentStep && setCurrentStep(step.step)}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-1.5 transition-all",
                  step.step === currentStep
                    ? "bg-primary/10 text-primary"
                    : step.step < currentStep
                    ? "text-muted-foreground hover:bg-muted"
                    : "text-muted-foreground/40"
                )}
              >
                <span className={cn(
                  "flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold",
                  step.step === currentStep
                    ? "bg-primary text-primary-foreground"
                    : step.step < currentStep
                    ? "bg-primary/20 text-primary"
                    : "bg-muted text-muted-foreground"
                )}>
                  {step.step < currentStep ? (
                    <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    step.step
                  )}
                </span>
                <span className="hidden text-xs font-medium sm:inline">{step.title}</span>
              </button>
              {idx < TRAINING_STEPS.length - 1 && (
                <div className={cn("h-px flex-1", step.step < currentStep ? "bg-primary/30" : "bg-border")} />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Chat Area */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Employee Info Header */}
          <div className="flex items-center gap-3 border-b border-border/60 bg-card/50 px-4 py-2.5">
            <div className={cn("flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br text-sm font-medium text-white", profile.avatarGradient)}>
              {profile.name.charAt(0)}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground">{session.employee_name}</span>
                <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground">{profile.title}</span>
              </div>
              <span className="text-[10px] text-muted-foreground">第 {currentStep} 步 · {currentStepInfo.title} · {currentStepInfo.duration}</span>
            </div>
            <div className="flex items-center gap-2">
              {session.rag_enabled && (
                <span className="hidden items-center gap-1 rounded bg-primary/10 px-2 py-0.5 text-[10px] text-primary sm:flex">
                  <span className="h-1 w-1 rounded-full bg-primary" />
                  RAG
                </span>
              )}
              <span className="rounded bg-secondary px-2 py-0.5 text-[10px] text-muted-foreground capitalize">{session.difficulty}</span>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-4">
            <div className="mx-auto max-w-3xl space-y-3">
              {/* Step Guide */}
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                <div className="flex items-start gap-2">
                  <svg className="mt-0.5 h-4 w-4 shrink-0 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="text-xs font-medium text-primary">{currentStepInfo.title}阶段指导</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{STEP_GUIDE_PROMPTS[currentStep]}</p>
                  </div>
                </div>
              </div>

              {messages.map((msg, idx) => (
                <MessageBubble key={idx} message={msg} employeeName={session.employee_name} />
              ))}

              {/* Streaming message */}
              {streaming && (
                <div className="flex justify-start">
                  <div className="max-w-[80%] rounded-2xl rounded-tl-sm bg-card border border-border px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground">{session.employee_name} 正在输入</span>
                      <span className="flex gap-0.5">
                        <span className="h-1 w-1 animate-bounce rounded-full bg-muted-foreground" style={{ animationDelay: "0ms" }} />
                        <span className="h-1 w-1 animate-bounce rounded-full bg-muted-foreground" style={{ animationDelay: "150ms" }} />
                        <span className="h-1 w-1 animate-bounce rounded-full bg-muted-foreground" style={{ animationDelay: "300ms" }} />
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {streamingContent && (
                <div className="flex justify-start animate-fade-in">
                  <div className="max-w-[80%] rounded-2xl rounded-tl-sm bg-card border border-border px-4 py-2.5">
                    <p className="text-sm text-foreground whitespace-pre-wrap">{streamingContent}<span className="animate-cursor-blink text-primary">|</span></p>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input Area */}
          <div className="border-t border-border/60 bg-card px-4 py-3">
            <div className="mx-auto max-w-3xl">
              <div className="flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={`输入您要对${session.employee_name}说的话... (Enter发送, Shift+Enter换行)`}
                  rows={1}
                  className="flex-1 resize-none rounded-xl border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 scrollbar-thin"
                  style={{ maxHeight: "120px" }}
                  disabled={streaming}
                />
                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || streaming}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-all hover:opacity-90 active:scale-95 disabled:opacity-40"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground">
                  第 {currentStep} 步 / 共 4 步 · {messages.filter((m) => m.step === currentStep).length} 条对话
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={runAnalysis}
                    disabled={analyzing || messages.filter((m) => m.step === currentStep).length === 0}
                    className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-40"
                  >
                    {analyzing ? (
                      <svg className="h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    ) : (
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    )}
                    实时分析
                  </button>
                  {currentStep < 4 ? (
                    <button
                      onClick={nextStep}
                      disabled={messages.filter((m) => m.step === currentStep).length === 0}
                      className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-all hover:opacity-90 disabled:opacity-40"
                    >
                      进入下一步
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  ) : (
                    <button
                      onClick={finishSession}
                      disabled={generatingSummary}
                      className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-all hover:opacity-90 disabled:opacity-40"
                    >
                      {generatingSummary ? (
                        <svg className="h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                      ) : null}
                      完成训练
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Analysis Sidebar */}
        <aside className="hidden w-80 shrink-0 border-l border-border/60 bg-card overflow-y-auto scrollbar-thin lg:block">
          <div className="p-4">
            <h3 className="mb-3 text-sm font-semibold text-foreground">实时分析</h3>

            {currentAnalysis ? (
              <div className="space-y-4 animate-fade-in">
                {/* Score */}
                <div className="rounded-xl border border-border/60 bg-background p-4 text-center">
                  <div className="text-3xl font-bold tabular-nums text-primary">{currentAnalysis.score}</div>
                  <div className="text-xs text-muted-foreground">本阶段得分</div>
                  <div className="mt-1">
                    <ScoreBadge score={currentAnalysis.score} />
                  </div>
                </div>

                {/* Employee Mood */}
                {currentAnalysis.employeeMood && (
                  <div className="rounded-lg border border-border/60 bg-background p-3">
                    <div className="mb-1 text-[10px] font-medium text-muted-foreground">员工当前情绪</div>
                    <p className="text-xs text-foreground">{currentAnalysis.employeeMood}</p>
                  </div>
                )}

                {/* Dimensions */}
                {currentAnalysis.dimensions && Object.keys(currentAnalysis.dimensions).length > 0 && (
                  <div className="rounded-lg border border-border/60 bg-background p-3">
                    <div className="mb-2 text-[10px] font-medium text-muted-foreground">维度评分</div>
                    <div className="space-y-2">
                      {Object.entries(currentAnalysis.dimensions).map(([key, val]) => (
                        <div key={key}>
                          <div className="mb-0.5 flex items-center justify-between text-[10px]">
                            <span className="text-muted-foreground">{DIMENSION_LABELS[key] || key}</span>
                            <span className="font-medium tabular-nums text-foreground">{val}</span>
                          </div>
                          <div className="h-1 overflow-hidden rounded-full bg-muted">
                            <div
                              className={cn("h-full rounded-full transition-all", val >= 75 ? "bg-primary" : val >= 60 ? "bg-amber-500" : "bg-red-500")}
                              style={{ width: `${val}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Highlights */}
                {currentAnalysis.highlights && currentAnalysis.highlights.length > 0 && (
                  <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-3">
                    <div className="mb-2 flex items-center gap-1.5 text-[10px] font-medium text-green-600">
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      沟通亮点
                    </div>
                    <ul className="space-y-1">
                      {currentAnalysis.highlights.map((h, i) => (
                        <li key={i} className="text-xs text-foreground">• {h}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Improvements */}
                {currentAnalysis.improvements && currentAnalysis.improvements.length > 0 && (
                  <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
                    <div className="mb-2 flex items-center gap-1.5 text-[10px] font-medium text-amber-600">
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      待改进
                    </div>
                    <ul className="space-y-1">
                      {currentAnalysis.improvements.map((im, i) => (
                        <li key={i} className="text-xs text-foreground">• {im}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Suggestion */}
                {currentAnalysis.suggestion && (
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                    <div className="mb-1 text-[10px] font-medium text-primary">改进建议</div>
                    <p className="text-xs text-foreground">{currentAnalysis.suggestion}</p>
                  </div>
                )}

                {/* Techniques Used */}
                {currentAnalysis.techniqueUsed && currentAnalysis.techniqueUsed.length > 0 && (
                  <div>
                    <div className="mb-1.5 text-[10px] font-medium text-muted-foreground">已使用技巧</div>
                    <div className="flex flex-wrap gap-1">
                      {currentAnalysis.techniqueUsed.map((t, i) => (
                        <span key={i} className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">{t}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border bg-background/50 p-6 text-center">
                <svg className="mx-auto mb-2 h-8 w-8 text-muted-foreground/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <p className="text-xs text-muted-foreground">
                  对话后点击"实时分析"
                  <br />
                  查看本阶段评分和建议
                </p>
              </div>
            )}

            {/* All Steps Summary */}
            {Object.keys(analyses).length > 0 && (
              <div className="mt-4 pt-4 border-t border-border/60">
                <div className="mb-2 text-[10px] font-medium text-muted-foreground">各阶段得分</div>
                <div className="space-y-1.5">
                  {[1, 2, 3, 4].map((s) => (
                    <div key={s} className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">第{s}步 {TRAINING_STEPS[s - 1]?.title}</span>
                      <span className={cn("font-medium tabular-nums", analyses[s] ? "text-foreground" : "text-muted-foreground/40")}>
                        {analyses[s] ? `${analyses[s].score}分` : "未分析"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Summary Modal */}
      {showSummary && summary && (
        <SummaryModal summary={summary} onClose={() => router.push("/history")} sessionId={sessionId!} />
      )}
    </div>
  );
}

function MessageBubble({ message, employeeName }: { message: ChatMessage; employeeName: string }) {
  const isManager = message.role === "manager";
  return (
    <div className={cn("flex animate-slide-up", isManager ? "justify-end" : "justify-start")}>
      <div className={cn(
        "max-w-[80%] rounded-2xl px-4 py-2.5",
        isManager
          ? "rounded-tr-sm bg-primary text-primary-foreground"
          : "rounded-tl-sm bg-card border border-border text-foreground"
      )}>
        {!isManager && (
          <div className="mb-0.5 text-[10px] text-muted-foreground">{employeeName}</div>
        )}
        <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
      </div>
    </div>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const label = score >= 90 ? "优秀" : score >= 75 ? "良好" : score >= 60 ? "合格" : "待提升";
  const color = score >= 90 ? "bg-green-500/10 text-green-600" : score >= 75 ? "bg-primary/10 text-primary" : score >= 60 ? "bg-amber-500/10 text-amber-600" : "bg-red-500/10 text-red-600";
  return <span className={cn("rounded px-2 py-0.5 text-[10px] font-medium", color)}>{label}</span>;
}

function SummaryModal({ summary, onClose, sessionId }: { summary: Record<string, unknown>; onClose: () => void; sessionId: string }) {
  const overallScore = summary.overallScore as number || 0;
  const summaryText = summary.summary as string || "";
  const strengths = (summary.strengths as string[]) || [];
  const weaknesses = (summary.weaknesses as string[]) || [];
  const growthPath = (summary.growthPath as string[]) || [];
  const recommendedFocus = summary.recommendedFocus as string || "";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="mx-4 max-h-[85vh] w-full max-w-lg overflow-y-auto scrollbar-thin rounded-2xl bg-card p-6 animate-scale-in" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">训练总结报告</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Overall Score */}
        <div className="mb-4 rounded-xl border border-border/60 bg-background p-4 text-center">
          <div className="text-4xl font-bold tabular-nums text-primary">{overallScore}</div>
          <div className="text-xs text-muted-foreground">综合评分</div>
          <div className="mt-1">
            <ScoreBadge score={overallScore} />
          </div>
        </div>

        {/* Summary */}
        {summaryText && (
          <div className="mb-4">
            <h3 className="mb-1.5 text-xs font-semibold text-muted-foreground">总体评价</h3>
            <p className="text-sm leading-relaxed text-foreground">{summaryText}</p>
          </div>
        )}

        {/* Strengths */}
        {strengths.length > 0 && (
          <div className="mb-4">
            <h3 className="mb-1.5 text-xs font-semibold text-green-600">核心优势</h3>
            <ul className="space-y-1">
              {strengths.map((s, i) => (
                <li key={i} className="text-sm text-foreground">• {s}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Weaknesses */}
        {weaknesses.length > 0 && (
          <div className="mb-4">
            <h3 className="mb-1.5 text-xs font-semibold text-amber-600">待提升领域</h3>
            <ul className="space-y-1">
              {weaknesses.map((w, i) => (
                <li key={i} className="text-sm text-foreground">• {w}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Growth Path */}
        {growthPath.length > 0 && (
          <div className="mb-4">
            <h3 className="mb-1.5 text-xs font-semibold text-primary">成长建议</h3>
            <ul className="space-y-1">
              {growthPath.map((g, i) => (
                <li key={i} className="text-sm text-foreground">{i + 1}. {g}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Recommended Focus */}
        {recommendedFocus && (
          <div className="mb-4 rounded-lg border border-primary/20 bg-primary/5 p-3">
            <div className="text-xs font-medium text-primary">下次练习重点</div>
            <p className="mt-0.5 text-sm text-foreground">{recommendedFocus}</p>
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-all hover:opacity-90"
          >
            查看历史记录
          </button>
          <a
            href={`/api/sessions/${sessionId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            导出数据
          </a>
        </div>
      </div>
    </div>
  );
}
