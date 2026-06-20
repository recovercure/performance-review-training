import { NextRequest, NextResponse } from "next/server";
import { llmStream } from "@/lib/llm-client";
import { buildEmployeeSystemPrompt } from "@/lib/prompts";
import { searchKnowledge, formatKnowledgeContext } from "@/lib/knowledge";
import type { EmployeeType, Difficulty } from "@/lib/employee-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface StreamRequestBody {
  messages: ChatMessage[];
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

    let systemPrompt = buildEmployeeSystemPrompt(employeeType, employeeName, step, difficulty);

    if (ragEnabled) {
      const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
      if (lastUserMsg) {
        const knowledge = await searchKnowledge(lastUserMsg.content, 3);
        if (knowledge.length > 0) {
          systemPrompt += formatKnowledgeContext(knowledge);
        }
      }
    }

    const fullMessages: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      ...messages,
    ];

    if (!fullMessages.some((m) => m.role === "user")) {
      fullMessages.push({ role: "user", content: "请开始面谈。" });
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of llmStream(fullMessages)) {
            const data = `data: ${JSON.stringify({ content: chunk })}\n\n`;
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
