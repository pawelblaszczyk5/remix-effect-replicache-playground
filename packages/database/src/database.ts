import type { Client } from "@libsql/client";

import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { Config, Context, Data, Effect, Layer } from "effect";

import { entries } from "#src/schema.js";

class DatabaseMigrationError extends Data.TaggedClass("DatabaseMigrationError") {}

const makeTursoClientLive = ({ url }: { url: string }) => {
	return createClient({
		fetch,
		url,
	});
};

const makeDatabaseLive = (client: Client) => {
	const database = drizzle(client, {
		schema: { entries },
	});

	return database;
};

const DatabaseLocalUrl = Config.string("DATABASE_LOCAL_URL");

export class Database extends Context.Tag("@repo/database#Database")<Database, ReturnType<typeof makeDatabaseLive>>() {
	static readonly live = Layer.effect(
		// eslint-disable-next-line fp/no-this -- ideally I'd disable it only for services files
		this,
		Effect.gen(function* () {
			const databaseLocalUrl = yield* DatabaseLocalUrl;

			const client = makeTursoClientLive({ url: databaseLocalUrl });

			const database = makeDatabaseLive(client);

			yield* Effect.tryPromise({
				catch: () => {
					return new DatabaseMigrationError();
				},
				try: async () => {
					return migrate(database, {
						migrationsFolder: "node_modules/@repo/database/drizzle/",
					});
				},
			});

			return database;
		}),
	);
}
