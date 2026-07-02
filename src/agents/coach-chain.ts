import { SystemMessage } from "@langchain/core/messages";
import { createAnalysisModel } from "@/lib/langchain-client";
import { COACH_PROMPT } from "./prompts/coach";
import { SUMMARY_PROMPT } from "./prompts/summaries";
import { buildCoachPromptInput, buildSummaryPromptInput } from "./prompt-helpers";
import type { EmployeeType } from "@/lib/employee-types";

interface AnalysisInput {
  messages: { role: string; content: string }[];
  employeeType: EmployeeType;
  step: number;
  employeeName: string;
}

interface SummaryInput {
  employeeType: EmployeeType;
  employeeName: string;
  stepScores: number[];
}

/**
 * Invoke the analysis LLM with the coach prompt.
 */
export async function runCoachAnalysis(input: AnalysisInput) {
  const model = createAnalysisModel();

  const conversationText = input.messages
    .map((m) => `${m.role === "user" ? "管理者" : "员工"}：${m.content}`)
    .join("\n");

  const promptInput = buildCoachPromptInput({
    step: input.step,
    employeeType: input.employeeType,
    employeeName: input.employeeName,
    conversationText,
  });

  const formatted = await COACH_PROMPT.format(promptInput);
  const response = await model.invoke([
    new SystemMessage(formatted),
  ]);

  const content = typeof response.content === "string" ? response.content : "";
  return parseLLMJson(content);
}

/**
 * Invoke the summary LLM.
 */
export async function runSummaryAnalysis(input: SummaryInput) {
  const model = createAnalysisModel();

  const promptInput = buildSummaryPromptInput({
    employeeType: input.employeeType,
    employeeName: input.employeeName,
    scores: input.stepScores,
  });

  const formatted = await SUMMARY_PROMPT.format(promptInput);
  const response = await model.invoke([
    new SystemMessage(formatted),
  ]);

  const content = typeof response.content === "string" ? response.content : "";
  return parseLLMJson(content);
}

function parseLLMJson(raw: string): Record<string, unknown> {
  try {
    const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    return { raw };
  }
}

