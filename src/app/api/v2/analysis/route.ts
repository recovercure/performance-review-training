import { NextRequest, NextResponse } from "next/server";
import { runCoachAnalysis, runSummaryAnalysis } from "@/agents/coach-chain";
import type { EmployeeType } from "@/lib/employee-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface AnalysisRequest {
  messages: { role: string; content: string }[];
  employeeType: EmployeeType;
  employeeName: string;
  step: number;
  mode?: "summary";
  stepScores?: number[];
}

export async function POST(request: NextRequest) {
  try {
    const body: AnalysisRequest = await request.json();
    const { messages, employeeType, employeeName, step, mode, stepScores } = body;

    if (mode === "summary") {
      try {
        const data = await runSummaryAnalysis({
          employeeType,
          employeeName,
          stepScores: stepScores || [],
        });
        return NextResponse.json({ success: true, data });
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

    try {
      const data = await runCoachAnalysis({ messages, employeeType, step, employeeName });
      return NextResponse.json({ success: true, data });
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
