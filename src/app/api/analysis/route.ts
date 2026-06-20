import { NextRequest, NextResponse } from "next/server";
import { llmInvoke } from "@/lib/llm-client";
import { buildAnalysisSystemPrompt, buildSummaryPrompt } from "@/lib/prompts";
import type { EmployeeType } from "@/lib/employee-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface AnalysisRequest {
  messages: { role: string; content: string }[];
  employeeType: EmployeeType;
  step: number;
  mode?: "summary";
  stepScores?: number[];
}

export async function POST(request: NextRequest) {
  try {
    const body: AnalysisRequest = await request.json();
    const { messages, employeeType, step, mode, stepScores } = body;

    if (mode === "summary") {
      const summaryPrompt = buildSummaryPrompt(employeeType, stepScores || []);
      const summaryMessages = [
        { role: "system" as const, content: summaryPrompt },
        { role: "user" as const, content: "请生成总结报告" },
      ];

      try {
        const content = await llmInvoke(summaryMessages);
        let summaryResult;
        try {
          const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
          summaryResult = JSON.parse(cleaned);
        } catch {
          summaryResult = {
            overallScore: stepScores && stepScores.length > 0
              ? Math.round(stepScores.reduce((a, b) => a + b, 0) / stepScores.length)
              : 0,
            summary: content,
            strengths: [],
            weaknesses: [],
            growthPath: [],
            recommendedFocus: "",
          };
        }
        return NextResponse.json({ success: true, data: summaryResult });
      } catch (llmError) {
        const errMsg = llmError instanceof Error ? llmError.message : "AI summary service unavailable";
        return NextResponse.json({
          success: true,
          data: {
            overallScore: stepScores && stepScores.length > 0
              ? Math.round(stepScores.reduce((a, b) => a + b, 0) / stepScores.length)
              : 0,
            summary: "AI总结服务暂时不可用，已展示各步骤评分供参考。",
            strengths: [],
            weaknesses: [],
            growthPath: [],
            recommendedFocus: "建议稍后重新生成总结报告",
          },
          fallback: true,
          error: errMsg,
        });
      }
    }

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "messages is required" }, { status: 400 });
    }

    const systemPrompt = buildAnalysisSystemPrompt(step, employeeType);
    const conversationText = messages
      .map((m) => `${m.role === "user" ? "管理者" : "员工"}：${m.content}`)
      .join("\n");

    const analysisMessages = [
      { role: "system" as const, content: systemPrompt },
      { role: "user" as const, content: `请分析以下面谈对话：\n\n${conversationText}` },
    ];

    try {
      const content = await llmInvoke(analysisMessages);
      let analysisResult;
      try {
        const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        analysisResult = JSON.parse(cleaned);
      } catch {
        analysisResult = {
          score: 0,
          dimensions: {},
          highlights: [],
          improvements: [],
          suggestion: content,
          employeeMood: "未知",
          techniqueUsed: [],
        };
      }
      return NextResponse.json({ success: true, data: analysisResult });
    } catch (llmError) {
      const errMsg = llmError instanceof Error ? llmError.message : "AI analysis service unavailable";
      return NextResponse.json({
        success: true,
        data: {
          score: 0,
          dimensions: {},
          highlights: [],
          improvements: [],
          suggestion: "AI分析服务暂时不可用，请稍后重试",
          employeeMood: "未知",
          techniqueUsed: [],
        },
        fallback: true,
        error: errMsg,
      });
    }
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
