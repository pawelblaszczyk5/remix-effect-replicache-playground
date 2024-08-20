import { blob, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const cvr = sqliteTable("cvr", {
	entities: blob("entities", { mode: "json" }).$type<Record<string, number>>().notNull(),
	id: text("id").primaryKey(),
	lastMutationIds: blob("last_mutation_ids", { mode: "json" }).$type<Record<string, number>>().notNull(),
});

export type Cvr = (typeof cvr)["$inferSelect"];

export const replicacheClientGroup = sqliteTable("replicache_client-group", {
	cvrVersion: integer("cvr_version").notNull(),
	id: text("id").primaryKey(),
	userId: text("user_id").notNull(),
});

export type ReplicacheClientGroup = (typeof replicacheClientGroup)["$inferSelect"];

export const replicacheClient = sqliteTable("replicache_client", {
	clientGroupId: text("client_group_id").notNull(),
	id: text("id").primaryKey(),
	lastMutationId: integer("last_mutation_id").notNull(),
});

export type ReplicacheClient = (typeof replicacheClient)["$inferSelect"];

export const todo = sqliteTable("todo", {
	createdAt: integer("created_at").notNull(),
	id: text("id").primaryKey(),
	isCompleted: integer("is_completed", { mode: "boolean" }).notNull(),
	isPrivate: integer("is_private", { mode: "boolean" }).notNull(),
	owner: text("owner").notNull(),
	text: text("text").notNull(),
	version: integer("version").notNull(),
});
