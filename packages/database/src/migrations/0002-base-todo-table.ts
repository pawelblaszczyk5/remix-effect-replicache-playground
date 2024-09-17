import { SqliteClient } from "@effect/sql-sqlite-node";
import { Effect } from "effect";

export const baseTodoTableMigration = Effect.gen(function* () {
	const sql = yield* SqliteClient.SqliteClient;

	yield* sql`
		CREATE TABLE ${sql("todo")} (
			${sql("id")} TEXT PRIMARY KEY,
			${sql("createdAt")} INTEGER NOT NULL,
			${sql("isCompleted")} INTEGER NOT NULL,
			${sql("isPrivate")} INTEGER NOT NULL,
			${sql("owner")} TEXT NOT NULL,
			${sql("text")} TEXT NOT NULL,
			${sql("version")} INTEGER NOT NULL
		);
	`;
});
