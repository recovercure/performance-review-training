const DEFAULT_BASE_URL = "https://api.openai.com/v1";

function getEnvConfig() {
  return {
    apiKey: process.env.LLM_API_KEY || "",
    baseUrl: (process.env.LLM_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, ""),
    chatModel: process.env.LLM_CHAT_MODEL || "gpt-4o-mini",
    analysisModel: process.env.LLM_ANALYSIS_MODEL || "gpt-4o-mini",
  };
}

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface StreamOptions {
  model?: string;
  temperature?: number;
}

interface InvokeOptions {
  model?: string;
  temperature?: number;
}

export async function* llmStream(
  messages: ChatMessage[],
  options: StreamOptions = {}
): AsyncGenerator<string> {
  const config = getEnvConfig();
  if (!config.apiKey) throw new Error("LLM_API_KEY is not set");

  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: options.model || config.chatModel,
      messages,
      temperature: options.temperature ?? 0.8,
      stream: true,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`LLM API error ${response.status}: ${body}`);
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith("data: ")) continue;
      const payload = trimmed.slice(6);
      if (payload === "[DONE]") return;

      try {
        const parsed = JSON.parse(payload);
        const delta = parsed.choices?.[0]?.delta?.content;
        if (delta) yield delta;
      } catch {
        // skip malformed SSE lines
      }
    }
  }
}

export async function llmInvoke(
  messages: ChatMessage[],
  options: InvokeOptions = {}
): Promise<string> {
  const config = getEnvConfig();
  if (!config.apiKey) throw new Error("LLM_API_KEY is not set");

  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: options.model || config.analysisModel,
      messages,
      temperature: options.temperature ?? 0.3,
      stream: false,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`LLM API error ${response.status}: ${body}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}
