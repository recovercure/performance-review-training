import { EMPLOYEE_PROFILES, type EmployeeType } from "@/lib/employee-types";
import { TRAINING_STEPS } from "@/lib/training-steps";
import type { EmployeePromptInput } from "./prompts/employee";
import type { CoachPromptInput } from "./prompts/coach";
import type { SummaryPromptInput } from "./prompts/summaries";

export function buildEmployeePromptInput(params: {
  employeeType: string;
  employeeName: string;
  step: number;
  difficulty: string;
  knowledgeContext?: string;
}): EmployeePromptInput {
  const profile = EMPLOYEE_PROFILES[params.employeeType as EmployeeType];
  const stepInfo = TRAINING_STEPS[params.step - 1];

  const difficultyMod =
    {
      easy: "你的反应相对温和，配合度较高，偶尔提出小质疑。",
      medium: "你的反应符合该类型员工的典型表现，有一定挑战性。",
      hard: "你的反应较为强烈，频繁展现该类型员工的典型特征，给管理者较大压力。",
    }[params.difficulty] || "你的反应符合该类型员工的典型表现。";

  return {
    employeeName: params.employeeName,
    employeeType: params.employeeType as EmployeeType,
    step: params.step,
    difficulty: params.difficulty,
    personalityTraits: profile.personalityTraits.join("、"),
    title: profile.title,
    responseStyle: profile.responseStyle,
    initialMood: profile.initialMood,
    description: profile.description,
    difficultyMod,
    stepTitle: stepInfo.title,
    stepSubtitle: stepInfo.subtitle,
    stepDescription: stepInfo.description,
    stepGoals: stepInfo.goals.join("；"),
    knowledgeContext: params.knowledgeContext || "",
  };
}

export function buildCoachPromptInput(params: {
  step: number;
  employeeType: string;
  employeeName: string;
  conversationText: string;
}): CoachPromptInput {
  const profile = EMPLOYEE_PROFILES[params.employeeType as EmployeeType];
  const stepInfo = TRAINING_STEPS[params.step - 1];

  return {
    step: params.step,
    stepTitle: stepInfo.title,
    keyTechniques: stepInfo.keyTechniques.join("、"),
    stepGoals: stepInfo.goals.join("；"),
    employeeTitle: profile.title,
    employeeName: params.employeeName,
    conversationText: params.conversationText,
  };
}

export function buildSummaryPromptInput(params: {
  employeeType: string;
  employeeName: string;
  scores: number[];
}): SummaryPromptInput {
  const profile = EMPLOYEE_PROFILES[params.employeeType as EmployeeType];

  return {
    employeeType: profile.title,
    employeeName: params.employeeName,
    step1Score: params.scores[0] || 0,
    step2Score: params.scores[1] || 0,
    step3Score: params.scores[2] || 0,
    step4Score: params.scores[3] || 0,
  };
}
