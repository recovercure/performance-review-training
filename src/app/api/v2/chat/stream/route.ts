import { NextRequest, NextResponse } from "next/server";
import { HumanMessage, AIMessage, BaseMessage } from "@langchain/core/messages";
import { employeeReplyGraph } from "@/agents/graph";
import { employeeChatStream } from "@/agents/nodes/employee-chat";
import type { EmployeeType, Difficulty } from "@/lib/employee-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface StreamRequestBody {
  messages: { role: string; content: string }[];
  employeeType: EmployeeType;
  employeeName: string;
  step: number;
  difficulty: Difficulty;
  ragEnabled?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const body: StreamRequestBody = await request.json();
    const { messages, employeeType, employeeName, step, difficulty, ragEnabled } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "messages is required" }, { status: 400 });
    }

    // Convert frontend messages to LangChain BaseMessage format
    const baseMessages: BaseMessage[] = messages.map((m) => {
      if (m.role === "user") return new HumanMessage(m.content);
      return new AIMessage(m.content);
    });

    // Run the prompt-building graph to prepare system prompt
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const state = await (employeeReplyGraph as any).invoke({
      messages: baseMessages,
      chatHistory: messages,
      employeeType,
      employeeName,
      step,
      difficulty,
      ragEnabled: ragEnabled ?? false,
    });

    // Stream the employee reply
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const token of employeeChatStream(state)) {
            const data = `data: ${JSON.stringify({ content: token })}\n\n`;
            controller.enqueue(encoder.encode(data));
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (error) {
          const errMsg = error instanceof Error ? error.message : "Unknown error";
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: errMsg })}\n\n`)
          );
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        }
      },
    });

    return new NextResponse(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
