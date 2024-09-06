import { SqliteClient } from "@effect/sql-sqlite-node";
import { Effect } from "effect";

export const replicacheEntitiesMigration = Effect.gen(function* () {
	const sql = yield* SqliteClient.SqliteClient;

	yield* sql`
		CREATE TABLE ${sql("cvr")} (
			${sql("id")} text PRIMARY KEY,
			${sql("entities")} blob NOT NULL,
			${sql("lastMutationIds")} blob NOT NULL
		)
	`;

	yield* sql`
		CREATE TABLE ${sql("replicacheClient")} (
			${sql("id")} text PRIMARY KEY,
			${sql("clientGroupId")} text NOT NULL,
			${sql("lastMutationId")} integer NOT NULL
		)
	`;

	yield* sql`
		CREATE TABLE ${sql("replicacheClientGroup")} (
			${sql("id")} text PRIMARY KEY,
			${sql("cvrVersion")} integer NOT NULL,
			${sql("userId")} text NOT NULL
		)
	`;
});
