import { getSupabaseClient } from "@/storage/database/supabase-client";

export interface KnowledgeResult {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  relevance: number;
}

export async function searchKnowledge(
  query: string,
  limit: number = 3,
  category?: string
): Promise<KnowledgeResult[]> {
  const client = getSupabaseClient();

  const { data, error } = await client.rpc("search_knowledge", {
    search_query: query,
    match_count: limit,
    filter_category: category || null,
  });

  if (error) {
    console.error("Knowledge search error:", error);
    return [];
  }

  return data || [];
}

export function formatKnowledgeContext(results: KnowledgeResult[]): string {
  if (results.length === 0) return "";

  const formatted = results
    .map((r, i) => `[${i + 1}] ${r.title}\n${r.content}`)
    .join("\n\n");

  return `\n\n## 参考知识库资料\n以下是与当前对话相关的公司话术和案例，请参考这些资料来回应：\n\n${formatted}\n\n请自然地融入这些知识，不要直接引用来源编号。`;
}
