import { EMPLOYEE_PROMPT } from "../prompts/employee";
import { buildEmployeePromptInput } from "../prompt-helpers";
import type { EmployeeReplyState } from "../state";

export async function buildPromptNode(
  state: typeof EmployeeReplyState.State,
): Promise<Partial<typeof EmployeeReplyState.State>> {
  const promptInput = buildEmployeePromptInput({
    employeeType: state.employeeType,
    employeeName: state.employeeName,
    step: state.step,
    difficulty: state.difficulty,
    knowledgeContext: state.knowledgeContext,
  });

  const formatted = await EMPLOYEE_PROMPT.format({
    ...promptInput,
    chat_history: state.messages,
  });

  return { systemPrompt: formatted };
}

