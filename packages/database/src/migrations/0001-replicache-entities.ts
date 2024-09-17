import { SqliteClient } from "@effect/sql-sqlite-node";
import { Effect } from "effect";

export const replicacheEntitiesMigration = Effect.gen(function* () {
	const sql = yield* SqliteClient.SqliteClient;

	yield* sql`
		CREATE TABLE ${sql("cvr")} (
			${sql("id")} TEXT PRIMARY KEY,
			${sql("entities")} BLOB NOT NULL,
			${sql("lastMutationIds")} BLOB NOT NULL
		);
	`;

	yield* sql`
		CREATE TABLE ${sql("replicacheClient")} (
			${sql("id")} TEXT PRIMARY KEY,
			${sql("clientGroupId")} TEXT NOT NULL,
			${sql("lastMutationId")} INTEGER NOT NULL
		);
	`;

	yield* sql`
		CREATE TABLE ${sql("replicacheClientGroup")} (
			${sql("id")} TEXT PRIMARY KEY,
			${sql("cvrVersion")} INTEGER NOT NULL,
			${sql("userId")} TEXT NOT NULL
		);
	`;
});
