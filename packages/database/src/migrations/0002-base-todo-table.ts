import { SqliteClient } from "@effect/sql-sqlite-node";
import { Effect } from "effect";

export default Effect.flatMap(SqliteClient.SqliteClient, (sql) => {
	return Effect.gen(function* () {
		yield* sql`
			CREATE TABLE ${sql("todo")} (
			  ${sql("id")} TEXT PRIMARY KEY,
			  ${sql("createdAt")} INTEGER NOT NULL,
				${sql("isCompleted")} INTEGER NOT NULL,
				${sql("isPrivate")} INTEGER NOT NULL,
				${sql("owner")} text NOT NULL,
				${sql("text")} text NOT NULL,
				${sql("version")} integer NOT NULL
			)
		`;
	});
});
