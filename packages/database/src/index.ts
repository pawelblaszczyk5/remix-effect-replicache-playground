import { NodeContext } from "@effect/platform-node";
import { Schema } from "@effect/schema";
import { Model, SqlSchema } from "@effect/sql";
import { SqliteClient, SqliteMigrator } from "@effect/sql-sqlite-node";
import { Config, Effect, Layer, String } from "effect";

import { allMigrations } from "#src/migrations/entry.js";

export class Cvr extends Model.Class<Cvr>("Cvr")({
	entities: Model.JsonFromString(
		Schema.Record({
			key: Schema.String,
			value: Schema.Number,
		}),
	),
	id: Schema.String,
	lastMutationIds: Model.JsonFromString(
		Schema.Record({
			key: Schema.String,
			value: Schema.Number,
		}),
	),
}) {}

export class ReplicacheClient extends Model.Class<ReplicacheClient>("ReplicacheClient")({
	clientGroupId: Schema.String,
	id: Schema.String,
	lastMutationId: Schema.Int,
}) {}

export class ReplicacheClientGroup extends Model.Class<ReplicacheClientGroup>("ReplicacheClientGroup")({
	cvrVersion: Schema.Int,
	id: Schema.String,
	userId: Schema.String,
}) {}

export class Todo extends Model.Class<Todo>("Todo")({
	createdAt: Model.DateTimeInsertFromNumber,
	id: Schema.String,
	isCompleted: Schema.transform(Schema.Literal(0, 1), Schema.Boolean, {
		decode: (value) => {
			return Boolean(value);
		},
		encode: (value) => {
			return Number(value) as 0 | 1;
		},
		strict: true,
	}),
	isPrivate: Schema.transform(Schema.Literal(0, 1), Schema.Boolean, {
		decode: (value) => {
			return Boolean(value);
		},
		encode: (value) => {
			return Number(value) as 0 | 1;
		},
		strict: true,
	}),
	owner: Schema.String,
	text: Schema.String,
	version: Schema.Int,
}) {}

export const insertCvr = SqlSchema.void({
	execute: (request) => {
		return Effect.gen(function* () {
			const sql = yield* SqliteClient.SqliteClient;

			return yield* sql`INSERT INTO ${sql("cvr")} ${sql.insert(request)}`;
		});
	},
	Request: Cvr.insert,
});

export const findCvrById = SqlSchema.findOne({
	execute: (request) => {
		return Effect.gen(function* () {
			const sql = yield* SqliteClient.SqliteClient;

			return yield* sql`SELECT * FROM ${sql("cvr")} where ${sql("id")} = ${request}`;
		});
	},
	Request: Cvr.fields.id,
	Result: Cvr,
});

export const findReplicacheClientGroupById = SqlSchema.findOne({
	execute: (request) => {
		return Effect.gen(function* () {
			const sql = yield* SqliteClient.SqliteClient;

			return yield* sql`SELECT * FROM ${sql("replicacheClientGroup")} where ${sql("id")} = ${request}`;
		});
	},
	Request: ReplicacheClientGroup.fields.id,
	Result: ReplicacheClientGroup,
});

export const upsertReplicacheClientGroup = SqlSchema.void({
	execute: (request) => {
		return Effect.gen(function* () {
			const sql = yield* SqliteClient.SqliteClient;

			return yield* sql`INSERT INTO ${sql("replicacheClientGroup")} ${sql.insert(request)} ON CONFLICT(${sql("id")}) DO UPDATE SET ${sql.update(
				request,
				["id"],
			)}`;
		});
	},
	Request: ReplicacheClientGroup,
});

export const findReplicacheClientById = SqlSchema.findOne({
	execute: (request) => {
		return Effect.gen(function* () {
			const sql = yield* SqliteClient.SqliteClient;

			return yield* sql`SELECT * FROM ${sql("replicacheClient")} where ${sql("id")} = ${request}`;
		});
	},
	Request: ReplicacheClient.fields.id,
	Result: ReplicacheClient,
});

export const findAllReplicacheClientsByClientGroup = SqlSchema.findAll({
	execute: (request) => {
		return Effect.gen(function* () {
			const sql = yield* SqliteClient.SqliteClient;

			return yield* sql`SELECT * FROM ${sql("replicacheClient")} WHERE ${sql("clientGroupId")} = ${request}`;
		});
	},
	Request: ReplicacheClient.fields.clientGroupId,
	Result: ReplicacheClient,
});

export const upsertReplicacheClient = SqlSchema.void({
	execute: (request) => {
		return Effect.gen(function* () {
			const sql = yield* SqliteClient.SqliteClient;

			return yield* sql`INSERT INTO ${sql("replicacheClient")} ${sql.insert(request)} ON CONFLICT(${sql("id")}) DO UPDATE SET ${sql.update(
				request,
				["id"],
			)}`;
		});
	},
	Request: ReplicacheClient,
});

export const insertTodo = SqlSchema.void({
	execute: (request) => {
		return Effect.gen(function* () {
			const sql = yield* SqliteClient.SqliteClient;

			return yield* sql`INSERT INTO ${sql("todo")} ${sql.insert({ ...request, version: 1 })}`;
		});
	},
	Request: Todo.insert,
});

export const deleteTodo = SqlSchema.single({
	execute: (request) => {
		return Effect.gen(function* () {
			const sql = yield* SqliteClient.SqliteClient;

			yield* sql`DELETE FROM ${sql("todo")} WHERE ${sql.and([
				sql`${sql("id")} = ${request.id}`,
				sql`${sql("owner")} = ${request.owner}`,
			])}`;

			return yield* sql`SELECT changes() as ${sql("rowsAffected")}`;
		});
	},
	Request: Schema.Struct(Todo.fields).pick("id", "owner"),
	Result: Schema.Struct({
		rowsAffected: Schema.Number,
	}),
});

export const findAllTodosForCvr = SqlSchema.findAll({
	execute: (request) => {
		return Effect.gen(function* () {
			const sql = yield* SqliteClient.SqliteClient;

			return yield* sql`
				SELECT ${sql.join(", ", false)([sql`${sql("id")}`, sql`${sql("version")}`])} 
				FROM ${sql("todo")} 
				WHERE ${sql.or([sql`${sql("owner")} = ${request}`, sql`${sql("isPrivate")} = 0`])}
			`;
		});
	},
	Request: Todo.fields.owner,
	Result: Schema.Struct(Todo.fields).pick("id", "version"),
});

export const findAllChangedTodos = SqlSchema.findAll({
	execute: (request) => {
		return Effect.gen(function* () {
			const sql = yield* SqliteClient.SqliteClient;

			return yield* sql`SELECT * FROM ${sql("todo")} WHERE ${sql.in("id", request)}`;
		});
	},
	Request: Schema.Array(Todo.fields.id),
	Result: Schema.Struct(Todo.fields).omit("version"),
});

export const updateTodoCompletion = SqlSchema.single({
	execute: (request) => {
		return Effect.gen(function* () {
			const sql = yield* SqliteClient.SqliteClient;

			yield* sql`UPDATE ${sql("todo")} SET ${sql.update(request, ["id", "owner"])}, ${sql("version")} = ${sql("version")} + 1 WHERE ${sql.and(
				[
					sql`${sql("id")} = ${request.id}`,
					sql.or([sql`${sql("owner")} = ${request.owner}`, sql`${sql("isPrivate")} = 0`]),
				],
			)}`;

			return yield* sql`SELECT changes() as ${sql("rowsAffected")}`;
		});
	},
	Request: Schema.Struct(Todo.fields).pick("id", "owner", "isCompleted"),
	Result: Schema.Struct({
		rowsAffected: Schema.Number,
	}),
});

const SqliteLive = SqliteClient.layer({
	filename: Config.string("DATABASE_LOCAL_URL"),
	transformQueryNames: Config.succeed(String.camelToSnake),
	transformResultNames: Config.succeed(String.snakeToCamel),
});

const MigratorLive = SqliteMigrator.layer({
	loader: Effect.gen(function* () {
		return allMigrations;
	}),
}).pipe(Layer.provide(SqliteLive));

export const DatabaseLive = Layer.mergeAll(SqliteLive, MigratorLive).pipe(Layer.provide(NodeContext.layer));

export { SqliteClient } from "@effect/sql-sqlite-node";
