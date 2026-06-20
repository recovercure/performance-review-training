import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, integer, jsonb, numeric, index, customType } from "drizzle-orm/pg-core";
import { serial } from "drizzle-orm/pg-core";

const tsvector = customType<{ data: string }>({
  dataType() {
    return "tsvector";
  },
});

export const healthCheck = pgTable("health_check", {
	id: serial().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

// 训练会话表
export const trainingSessions = pgTable(
	"training_sessions",
	{
		id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
		user_id: varchar("user_id", { length: 128 }).notNull().default("demo_user"),
		user_name: varchar("user_name", { length: 128 }).notNull().default("练习管理者"),
		employee_type: varchar("employee_type", { length: 32 }).notNull(),
		employee_name: varchar("employee_name", { length: 64 }).notNull(),
		scenario: varchar("scenario", { length: 256 }),
		difficulty: varchar("difficulty", { length: 16 }).notNull().default("medium"),
		current_step: integer("current_step").notNull().default(1),
		status: varchar("status", { length: 20 }).notNull().default("in_progress"),
		overall_score: numeric("overall_score", { precision: 5, scale: 2 }),
		summary: text("summary"),
		rag_enabled: boolean("rag_enabled").default(false).notNull(),
		created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
		updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => [
		index("training_sessions_user_id_idx").on(table.user_id),
		index("training_sessions_status_idx").on(table.status),
		index("training_sessions_created_at_idx").on(table.created_at),
	]
);

// 会话消息表
export const sessionMessages = pgTable(
	"session_messages",
	{
		id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
		session_id: varchar("session_id", { length: 36 }).notNull().references(() => trainingSessions.id, { onDelete: "cascade" }),
		role: varchar("role", { length: 16 }).notNull(),
		content: text("content").notNull(),
		step: integer("step").notNull().default(1),
		analysis: jsonb("analysis"),
		created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => [
		index("session_messages_session_id_idx").on(table.session_id),
		index("session_messages_step_idx").on(table.step),
	]
);

// 会话分析评分表
export const sessionAnalytics = pgTable(
	"session_analytics",
	{
		id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
		session_id: varchar("session_id", { length: 36 }).notNull().references(() => trainingSessions.id, { onDelete: "cascade" }),
		step: integer("step").notNull(),
		score: numeric("score", { precision: 5, scale: 2 }).notNull(),
		highlights: jsonb("highlights"),
		improvements: jsonb("improvements"),
		dimensions: jsonb("dimensions"),
		created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => [
		index("session_analytics_session_id_idx").on(table.session_id),
		index("session_analytics_step_idx").on(table.step),
	]
);

// 知识库文档表
export const knowledgeDocuments = pgTable(
	"knowledge_documents",
	{
		id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
		title: varchar("title", { length: 256 }).notNull(),
		content: text("content").notNull(),
		category: varchar("category", { length: 64 }).notNull().default("general"),
		tags: jsonb("tags").$type<string[]>().default([]),
		search_vector: tsvector("search_vector"),
		created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
		updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => [
		index("knowledge_documents_category_idx").on(table.category),
		index("knowledge_documents_search_vector_idx").using("gin", table.search_vector),
	]
);
