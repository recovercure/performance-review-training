import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");
    const category = searchParams.get("category");
    const limit = parseInt(searchParams.get("limit") || "5", 10);

    if (!query) {
      return NextResponse.json({ error: "q (query) is required" }, { status: 400 });
    }

    const client = getSupabaseClient();

    const { data, error } = await client.rpc("search_knowledge", {
      search_query: query,
      match_count: limit,
      filter_category: category || null,
    });

    if (error) throw new Error(`搜索失败: ${error.message}`);

    return NextResponse.json({ success: true, data: data || [] });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
