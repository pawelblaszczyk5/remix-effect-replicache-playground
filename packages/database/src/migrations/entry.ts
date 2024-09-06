import type { ResolvedMigration } from "@effect/sql/Migrator";

import { Effect } from "effect";

import { replicacheEntitiesMigration } from "#src/migrations/0001-replicache-entities.js";
import { baseTodoTableMigration } from "#src/migrations/0002-base-todo-table.js";

export const allMigrations: Array<ResolvedMigration> = [
	[1, "replicache-entities", Effect.succeed(replicacheEntitiesMigration)],
	[2, "base-todo-table", Effect.succeed(baseTodoTableMigration)],
];
