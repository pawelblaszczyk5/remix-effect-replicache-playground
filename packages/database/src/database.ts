import type { Client } from "@libsql/client";

import { createClient } from "@libsql/client";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { Config, Context, Data, Effect, Exit, Layer } from "effect";

import { cvr, replicacheClient, replicacheClientGroup, todo } from "#src/schema.js";

class DatabaseMigrationError extends Data.TaggedClass("DatabaseMigrationError") {}

const makeTursoClientLive = ({ url }: { url: string }) => {
	return createClient({
		fetch,
		url,
	});
};

const makeDatabaseLive = (client: Client) => {
	const database = drizzle(client, {
		schema: { cvr, replicacheClient, replicacheClientGroup, todo },
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

			yield* Effect.tryPromise(() => {
				return database.run(sql`PRAGMA journal_mode = WAL;`);
			});

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

type TransactionDatabaseInstance = Parameters<Parameters<ReturnType<typeof makeDatabaseLive>["transaction"]>[0]>[0];

export class TransactionDatabase extends Context.Tag("@repo/database#TransactionDatabase")<
	TransactionDatabase,
	TransactionDatabaseInstance
>() {
	static readonly provideTransaction = <A, E, R>(self: Effect.Effect<A, E, R>) => {
		return Effect.gen(function* () {
			const database = yield* Database;
			const transaction = Promise.withResolvers();

			return yield* Effect.acquireUseRelease(
				Effect.gen(function* () {
					const databaseAcquire = Promise.withResolvers<TransactionDatabaseInstance>();

					database
						.transaction(async (tx) => {
							databaseAcquire.resolve(tx);

							return transaction.promise;
						})
						.catch(() => {
							databaseAcquire.reject();
						});

					return yield* Effect.tryPromise(async () => {
						return databaseAcquire.promise;
					});
				}),
				(database) => {
					return self.pipe(
						// NOTE providing this instance as standard Database as well so it's overwritten in nested context accesses, it's not fully type-safe, but leaving it as is for now
						Effect.provideService(Database, database as unknown as Context.Tag.Service<Database>),
						Effect.provideService(TransactionDatabase, database),
					);
				},
				(_, exit) => {
					Exit.match(exit, {
						onFailure: (value) => {
							transaction.reject(value);
						},
						onSuccess: (value) => {
							transaction.resolve(value);
						},
					});

					return Effect.tryPromise(async () => {
						return transaction.promise;
					}).pipe(Effect.orDie);
				},
			);
		});
	};
}

export * from "drizzle-orm/sql";
