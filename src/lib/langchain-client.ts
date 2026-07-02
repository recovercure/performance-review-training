import { ChatOpenAI } from "@langchain/openai";

const DEFAULT_BASE_URL = "https://api.openai.com/v1";

function getConfig() {
  return {
    apiKey: process.env.LLM_API_KEY || "",
    baseURL: (process.env.LLM_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, ""),
    chatModel: process.env.LLM_CHAT_MODEL || "gpt-4o-mini",
    analysisModel: process.env.LLM_ANALYSIS_MODEL || "gpt-4o-mini",
  };
}

export function createChatModel(options?: { temperature?: number }) {
  const config = getConfig();
  if (!config.apiKey) throw new Error("LLM_API_KEY is not set");

  return new ChatOpenAI({
    model: config.chatModel,
    apiKey: config.apiKey,
    configuration: { baseURL: config.baseURL },
    temperature: options?.temperature ?? 0.8,
    streaming: true,
  });
}

export function createAnalysisModel(options?: { temperature?: number }) {
  const config = getConfig();
  if (!config.apiKey) throw new Error("LLM_API_KEY is not set");

  return new ChatOpenAI({
    model: config.analysisModel,
    apiKey: config.apiKey,
    configuration: { baseURL: config.baseURL },
    temperature: options?.temperature ?? 0.3,
  });
}

export function getLLMConfig() {
  return getConfig();
}
