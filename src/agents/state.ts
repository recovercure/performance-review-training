import { Annotation } from "@langchain/langgraph";
import { BaseMessage } from "@langchain/core/messages";

export interface AnalysisResult {
  score: number;
  dimensions: Record<string, number>;
  highlights: string[];
  improvements: string[];
  suggestion: string;
  employeeMood: string;
  techniqueUsed: string[];
}

/**
 * State for a single employee-reply turn.
 * The graph takes: chat history + session context → produces: employee reply.
 */
export const EmployeeReplyState = Annotation.Root({
  /** The conversation history (system + user + assistant messages). */
  messages: Annotation<BaseMessage[]>({
    reducer: (left, right) => left.concat(right),
    default: () => [],
  }),

  /** The raw chat messages from the frontend (simpler role/content format). */
  chatHistory: Annotation<{ role: string; content: string }[]>({
    reducer: (_, incoming) => incoming,
    default: () => [],
  }),

  /** The full system prompt content (built by build_prompt node). */
  systemPrompt: Annotation<string>,

  /** Knowledge base context injected into the system prompt (if RAG enabled). */
  knowledgeContext: Annotation<string>,

  /** Session context for prompt building. */
  employeeType: Annotation<string>,
  employeeName: Annotation<string>,
  step: Annotation<number>,
  difficulty: Annotation<string>,
  ragEnabled: Annotation<boolean>,
});
