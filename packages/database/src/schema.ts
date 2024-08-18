import { blob, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const cvr = sqliteTable("cvr", {
	entities: blob("entities", { mode: "json" }).$type<Record<string, number>>().notNull(),
	id: text("id").primaryKey(),
	lastMutationIds: blob("last_mutation_ids", { mode: "json" }).$type<Record<string, number>>().notNull(),
});

export const replicacheClientGroup = sqliteTable("replicache_client-group", {
	cvrVersion: integer("cvr_version").notNull(),
	id: text("id").primaryKey(),
	userId: text("user_id").notNull(),
});

export const replicacheClient = sqliteTable("replicache_client", {
	clientGroupId: text("client_group_id").notNull(),
	id: text("id").primaryKey(),
	lastMutationId: integer("last_mutation_id").notNull(),
});

export const todo = sqliteTable("todo", {
	createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
	id: text("id").primaryKey(),
	isCompleted: integer("is_completed", { mode: "boolean" }).notNull(),
	isPrivate: integer("is_private", { mode: "boolean" }).notNull(),
	owner: text("text").notNull(),
	text: text("text").notNull(),
	version: integer("version").notNull(),
});
