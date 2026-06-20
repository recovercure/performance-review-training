import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface CreateSessionBody {
  user_id?: string;
  user_name?: string;
  employee_type: string;
  employee_name: string;
  scenario?: string;
  difficulty?: string;
  rag_enabled?: boolean;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("user_id") || "demo_user";
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    const client = getSupabaseClient();
    const { data, error } = await client
      .from("training_sessions")
      .select("id, user_name, employee_type, employee_name, scenario, difficulty, current_step, status, overall_score, summary, created_at, updated_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw new Error(`查询失败: ${error.message}`);

    const { count, error: countError } = await client
      .from("training_sessions")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);

    if (countError) throw new Error(`统计失败: ${countError.message}`);

    return NextResponse.json({
      success: true,
      data: data || [],
      total: count || 0,
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateSessionBody = await request.json();

    if (!body.employee_type || !body.employee_name) {
      return NextResponse.json(
        { error: "employee_type and employee_name are required" },
        { status: 400 }
      );
    }

    const client = getSupabaseClient();
    const { data, error } = await client
      .from("training_sessions")
      .insert({
        user_id: body.user_id || "demo_user",
        user_name: body.user_name || "练习管理者",
        employee_type: body.employee_type,
        employee_name: body.employee_name,
        scenario: body.scenario || null,
        difficulty: body.difficulty || "medium",
        current_step: 1,
        status: "in_progress",
        rag_enabled: body.rag_enabled ?? true,
      })
      .select("id, user_name, employee_type, employee_name, scenario, difficulty, current_step, status, created_at")
      .single();

    if (error) throw new Error(`创建失败: ${error.message}`);

    return NextResponse.json({ success: true, data });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
