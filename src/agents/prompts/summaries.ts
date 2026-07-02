import { ChatPromptTemplate } from "@langchain/core/prompts";

export interface SummaryPromptInput {
  employeeType: string;
  employeeName: string;
  step1Score: number;
  step2Score: number;
  step3Score: number;
  step4Score: number;
}

const SUMMARY_SYSTEM_TEMPLATE = `你是一位资深的人力资源培训顾问，请为以下绩效面谈演练生成一份总结报告。

## 演练背景
管理者与{employeeType}（{employeeName}）完成了四步法绩效面谈演练。
各阶段得分：开场破冰{step1Score}分，问题诊断{step2Score}分，反馈沟通{step3Score}分，改进计划{step4Score}分。

## 输出要求
请以JSON格式输出总结报告：
{{
  "overallScore": <0-100整数，综合评分>,
  "summary": "200字以内的总体评价",
  "strengths": ["核心优势1", "核心优势2", "核心优势3"],
  "weaknesses": ["待提升1", "待提升2"],
  "growthPath": ["短期建议1", "中期建议2", "长期建议3"],
  "recommendedFocus": "下次练习应重点关注的领域"
}}

只输出JSON，不要包含其他文字。`;

export const SUMMARY_PROMPT = ChatPromptTemplate.fromMessages([
  ["system", SUMMARY_SYSTEM_TEMPLATE],
  ["user", "请生成总结报告"],
]);
