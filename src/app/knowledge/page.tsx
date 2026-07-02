"use client";

import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";

interface KnowledgeDoc {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

const CATEGORIES = [
  { value: "general", label: "通用" },
  { value: "话术", label: "话术" },
  { value: "案例", label: "案例" },
  { value: "政策", label: "政策" },
  { value: "技巧", label: "技巧" },
];

export default function KnowledgePage() {
  const [docs, setDocs] = useState<KnowledgeDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", content: "", category: "general", tags: "" });
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<KnowledgeDoc[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("");

  const fetchDocs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedCategory) params.set("category", selectedCategory);
      const res = await fetch(`/api/knowledge?${params}`);
      const json = await res.json();
      if (json.success) setDocs(json.data);
    } catch (err) {
      console.error("Failed to fetch docs:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory]);

  useEffect(() => {
    fetchDocs();
  }, [fetchDocs]);

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.content.trim()) return;

    try {
      const tags = form.tags.split(",").map((t) => t.trim()).filter(Boolean);
      const res = await fetch("/api/knowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, tags }),
      });

      if (!res.ok) throw new Error("保存失败");

      setForm({ title: "", content: "", category: "general", tags: "" });
      setShowForm(false);
      fetchDocs();
    } catch (err) {
      alert(err instanceof Error ? err.message : "保存失败");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("确定删除这条知识？")) return;

    try {
      const res = await fetch(`/api/knowledge?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("删除失败");
      fetchDocs();
    } catch (err) {
      alert(err instanceof Error ? err.message : "删除失败");
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);

    try {
      const params = new URLSearchParams({ q: searchQuery });
      const res = await fetch(`/api/knowledge/search?${params}`);
      const json = await res.json();
      if (json.success) setSearchResults(json.data);
    } catch (err) {
      console.error("Search failed:", err);
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">知识库管理</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          管理公司话术、案例和政策，启用 RAG 后将在训练中自动检索
        </p>
      </div>

      {/* Search */}
      <div className="mb-6 flex gap-2">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder="搜索知识库..."
          className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
        <button
          onClick={handleSearch}
          disabled={searching}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-40"
        >
          {searching ? "搜索中..." : "搜索"}
        </button>
      </div>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div className="mb-6 rounded-xl border border-primary/20 bg-primary/5 p-4">
          <h3 className="mb-3 text-sm font-semibold text-primary">搜索结果</h3>
          <div className="space-y-3">
            {searchResults.map((doc) => (
              <div key={doc.id} className="rounded-lg border border-border bg-background p-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-sm font-medium text-foreground">{doc.title}</div>
                    <div className="mt-0.5 text-[10px] text-muted-foreground">{doc.category}</div>
                  </div>
                  <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">
                    相关度 {(doc as KnowledgeDoc & { relevance?: number }).relevance?.toFixed(2) || "—"}
                  </span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground line-clamp-3">{doc.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Category Filter */}
      <div className="mb-4 flex items-center gap-2">
        <button
          onClick={() => setSelectedCategory("")}
          className={cn(
            "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
            !selectedCategory ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
          )}
        >
          全部
        </button>
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setSelectedCategory(cat.value)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
              selectedCategory === cat.value ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Add Button */}
      <div className="mb-4 flex justify-end">
        <button
          onClick={() => { setShowForm(!showForm); setEditingId(null); setForm({ title: "", content: "", category: "general", tags: "" }); }}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          {showForm ? "取消" : "添加知识"}
        </button>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="mb-6 rounded-xl border border-border bg-card p-4">
          <h3 className="mb-3 text-sm font-semibold text-foreground">{editingId ? "编辑知识" : "添加新知识"}</h3>
          <div className="space-y-3">
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="标题"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <textarea
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              placeholder="内容"
              rows={6}
              className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <div className="flex gap-3">
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
              <input
                type="text"
                value={form.tags}
                onChange={(e) => setForm({ ...form, tags: e.target.value })}
                placeholder="标签（逗号分隔）"
                className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <button
              onClick={handleSubmit}
              disabled={!form.title.trim() || !form.content.trim()}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-40"
            >
              保存
            </button>
          </div>
        </div>
      )}

      {/* Documents List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : docs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-background/50 p-12 text-center">
          <svg className="mx-auto mb-3 h-12 w-12 text-muted-foreground/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          <p className="text-sm text-muted-foreground">暂无知识文档</p>
          <p className="mt-1 text-xs text-muted-foreground/60">点击「添加知识」开始创建</p>
        </div>
      ) : (
        <div className="space-y-3">
          {docs.map((doc) => (
            <div key={doc.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-medium text-foreground">{doc.title}</h3>
                    <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground">{doc.category}</span>
                    {doc.tags && doc.tags.length > 0 && doc.tags.map((tag) => (
                      <span key={tag} className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">{tag}</span>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{doc.content}</p>
                  <div className="mt-2 text-[10px] text-muted-foreground/60">
                    更新于 {new Date(doc.updated_at).toLocaleString("zh-CN")}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleDelete(doc.id)}
                    className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

