import { formatKnowledgeForPrompt } from "../rag-chain";
import type { EmployeeReplyState } from "../state";

export async function searchKnowledgeNode(
  state: typeof EmployeeReplyState.State,
): Promise<Partial<typeof EmployeeReplyState.State>> {
  if (!state.ragEnabled) return { knowledgeContext: "" };

  const context = await formatKnowledgeForPrompt(state.chatHistory, 3);
  return { knowledgeContext: context };
}

