import { searchKnowledge, formatKnowledgeContext } from "@/lib/knowledge";

export async function retrieveKnowledgeContext(
  lastUserMessage: string,
  limit: number = 3,
): Promise<string> {
  const results = await searchKnowledge(lastUserMessage, limit);
  return formatKnowledgeContext(results);
}

export async function formatKnowledgeForPrompt(
  messages: { role: string; content: string }[],
  limit: number = 3,
): Promise<string> {
  const reversed = [...messages].reverse();
  const lastUserMsg = reversed.find((m) => m.role === "user");
  if (!lastUserMsg) return "";

  return retrieveKnowledgeContext(lastUserMsg.content, limit);
}

