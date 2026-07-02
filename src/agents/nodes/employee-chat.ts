import { SystemMessage, AIMessage } from "@langchain/core/messages";
import { createChatModel } from "@/lib/langchain-client";
import type { EmployeeReplyState } from "../state";
import type { BaseMessage } from "@langchain/core/messages";

/**
 * Build full messages for the LLM call: system prompt + conversation history.
 * Returns the stream of tokens.
 */
export async function* employeeChatStream(
  state: typeof EmployeeReplyState.State,
): AsyncGenerator<string> {
  const model = createChatModel();

  const messages: BaseMessage[] = [
    new SystemMessage(state.systemPrompt),
    ...state.messages,
  ];

  const stream = await model.stream(messages);

  for await (const chunk of stream) {
    const text = typeof chunk.content === "string"
      ? chunk.content
      : Array.isArray(chunk.content)
        ? chunk.content.map((c) => ("text" in c ? c.text : "")).join("")
        : "";
    if (text) yield text;
  }
}

/**
 * Non-streaming version: returns the full employee reply as state update.
 * Used when the API route wants to collect the full response first.
 */
export async function employeeChatInvoke(
  state: typeof EmployeeReplyState.State,
): Promise<Partial<typeof EmployeeReplyState.State>> {
  const model = createChatModel({ temperature: 0.8 });

  const messages: BaseMessage[] = [
    new SystemMessage(state.systemPrompt),
    ...state.messages,
  ];

  const response = await model.invoke(messages);
  const content = typeof response.content === "string"
    ? response.content
    : "";

  return {
    messages: [new AIMessage(content)],
  };
}

