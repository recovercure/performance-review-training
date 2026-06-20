import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface UpdateSessionBody {
  current_step?: number;
  status?: string;
  overall_score?: number;
  summary?: string;
  messages?: { role: string; content: string; step: number; analysis?: unknown }[];
  analytics?: { step: number; score: number; highlights?: string[]; improvements?: string[]; dimensions?: unknown }[];
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const client = getSupabaseClient();

    // Get session detail
    const { data: session, error: sessionError } = await client
      .from("training_sessions")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (sessionError) throw new Error(`查询会话失败: ${sessionError.message}`);
    if (!session) return NextResponse.json({ error: "会话不存在" }, { status: 404 });

    // Get messages
    const { data: messages, error: msgError } = await client
      .from("session_messages")
      .select("id, role, content, step, analysis, created_at")
      .eq("session_id", id)
      .order("created_at", { ascending: true });

    if (msgError) throw new Error(`查询消息失败: ${msgError.message}`);

    // Get analytics
    const { data: analytics, error: analyticsError } = await client
      .from("session_analytics")
      .select("id, step, score, highlights, improvements, dimensions, created_at")
      .eq("session_id", id)
      .order("step", { ascending: true });

    if (analyticsError) throw new Error(`查询分析失败: ${analyticsError.message}`);

    return NextResponse.json({
      success: true,
      data: {
        ...session,
        messages: messages || [],
        analytics: analytics || [],
      },
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body: UpdateSessionBody = await request.json();
    const client = getSupabaseClient();

    // Update session
    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.current_step !== undefined) updateData.current_step = body.current_step;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.overall_score !== undefined) updateData.overall_score = body.overall_score;
    if (body.summary !== undefined) updateData.summary = body.summary;

    const { error: updateError } = await client
      .from("training_sessions")
      .update(updateData)
      .eq("id", id);

    if (updateError) throw new Error(`更新会话失败: ${updateError.message}`);

    // Save messages if provided
    if (body.messages && body.messages.length > 0) {
      const msgRows = body.messages.map((m) => ({
        session_id: id,
        role: m.role,
        content: m.content,
        step: m.step,
        analysis: m.analysis || null,
      }));
      const { error: msgError } = await client.from("session_messages").insert(msgRows);
      if (msgError) throw new Error(`保存消息失败: ${msgError.message}`);
    }

    // Save analytics if provided
    if (body.analytics && body.analytics.length > 0) {
      // Delete old analytics for the same steps
      const steps = body.analytics.map((a) => a.step);
      if (steps.length > 0) {
        for (const step of steps) {
          await client.from("session_analytics").delete().eq("session_id", id).eq("step", step);
        }
      }
      const analyticsRows = body.analytics.map((a) => ({
        session_id: id,
        step: a.step,
        score: a.score,
        highlights: a.highlights ? JSON.parse(JSON.stringify(a.highlights)) : null,
        improvements: a.improvements ? JSON.parse(JSON.stringify(a.improvements)) : null,
        dimensions: a.dimensions ? JSON.parse(JSON.stringify(a.dimensions)) : null,
      }));
      const { error: analyticsError } = await client.from("session_analytics").insert(analyticsRows);
      if (analyticsError) throw new Error(`保存分析失败: ${analyticsError.message}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const client = getSupabaseClient();

    // Cascade delete will handle messages and analytics
    const { error } = await client.from("training_sessions").delete().eq("id", id);
    if (error) throw new Error(`删除失败: ${error.message}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
