import { StateGraph, START, END } from "@langchain/langgraph";
import { EmployeeReplyState } from "./state";
import { buildPromptNode } from "./nodes/build-prompt";
import { searchKnowledgeNode } from "./nodes/search-kb";

/**
 * Build a graph for a single employee reply turn.
 *
 * Flow:
 *   START → [rag_retrieve?] → build_prompt → END
 *
 * The LLM streaming call is handled by the API route (which calls employeeChatStream
 * directly), not by this graph. This graph only prepares the prompt with optional
 * knowledge injection.
 */
function routeFromStart(state: typeof EmployeeReplyState.State): string {
  if (state.ragEnabled) return "search_kb";
  return "build_prompt";
}

const builder = new StateGraph(EmployeeReplyState)
  .addNode("build_prompt", buildPromptNode)
  .addNode("search_kb", searchKnowledgeNode)
  .addConditionalEdges(START, routeFromStart, {
    search_kb: "search_kb",
    build_prompt: "build_prompt",
  })
  .addEdge("search_kb", "build_prompt")
  .addEdge("build_prompt", END);

export const employeeReplyGraph = builder.compile();

