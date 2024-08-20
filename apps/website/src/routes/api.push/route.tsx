import type { MutationV1, PushRequest } from "replicache";

import { json } from "@remix-run/react";
import { Effect, Match } from "effect";

import { and, eq, or, sql, TransactionDatabase } from "@repo/database";
import { replicacheClient, replicacheClientGroup, todo } from "@repo/database/schema";
import { defineEffectAction } from "@repo/effect-runtime";
import type { CreateTodoData, DeleteTodoData, UpdateTodoCompletionData } from "@repo/mutators-types";
import { RemixRequest } from "@repo/request-context";
import { UserService } from "@repo/user-service";

const processMutation = ({
	clientGroupId,
	mutation,
	user,
}: {
	clientGroupId: string;
	mutation: MutationV1;
	user: string;
}) => {
	let errorMode = false;

	return Effect.gen(function* () {
		const database = yield* TransactionDatabase;

		const clientGroup = yield* Effect.tryPromise(async () => {
			return database.select().from(replicacheClientGroup).where(eq(replicacheClientGroup.id, clientGroupId)).get();
		}).pipe(
			Effect.map((clientGroup) => {
				return clientGroup ?? { cvrVersion: 0, id: clientGroupId, userId: user };
			}),
		);

		if (clientGroup.userId !== user) {
			yield* Effect.fail("UNAUTHORIZED");
		}

		const client = yield* Effect.tryPromise(async () => {
			return database.select().from(replicacheClient).where(eq(replicacheClient.id, mutation.clientID)).get();
		}).pipe(
			Effect.map((client) => {
				return client ?? { clientGroupId, id: mutation.clientID, lastMutationId: 0 };
			}),
		);

		if (client.clientGroupId !== clientGroupId) {
			yield* Effect.fail("UNAUTHORIZED");
		}

		const nextMutationID = client.lastMutationId + 1;

		if (mutation.id < nextMutationID) {
			yield* Effect.fail("PAST_MUTATION" as const);
		}

		if (mutation.id > nextMutationID) {
			yield* Effect.fail("FUTURE_MUTATION" as const);
		}

		if (!errorMode) {
			yield* Match.value(mutation)
				.pipe(
					Match.when({ name: "createTodo" }, () => {
						return Effect.gen(function* () {
							const data = mutation.args as CreateTodoData;

							if (data.owner !== user) {
								yield* Effect.fail("INVALID_USER");
							}

							yield* Effect.tryPromise(() => {
								return database.insert(todo).values({
									createdAt: data.createdAt,
									id: data.id,
									isCompleted: false,
									isPrivate: data.isPrivate,
									owner: user,
									text: data.text,
									version: 1,
								});
							});
						});
					}),
					Match.when({ name: "deleteTodo" }, () => {
						return Effect.gen(function* () {
							const data = mutation.args as DeleteTodoData;

							const result = yield* Effect.tryPromise(() => {
								return database.delete(todo).where(and(eq(todo.id, data), eq(todo.owner, user)));
							});

							if (result.rowsAffected === 0) {
								yield* Effect.fail("Nonexistent todo");
							}
						});
					}),
					Match.when({ name: "updateTodoCompletion" }, (mutation) => {
						return Effect.gen(function* () {
							const data = mutation.args as UpdateTodoCompletionData;

							const result = yield* Effect.tryPromise(() => {
								return database
									.update(todo)
									.set({
										isCompleted: data.isCompleted,
										version: sql`${todo.version} + 1`,
									})
									.where(and(eq(todo.id, data.id), or(eq(todo.owner, user), eq(todo.isPrivate, false))));
							});

							if (result.rowsAffected === 0) {
								yield* Effect.fail("Nonexistent todo");
							}
						});
					}),
					Match.orElseAbsurd,
				)
				.pipe(
					Effect.mapError(() => {
						return "RETRY" as const;
					}),
				);
		}

		yield* Effect.tryPromise(async () => {
			const nextClientGroup = { cvrVersion: clientGroup.cvrVersion, userId: user };

			return database
				.insert(replicacheClientGroup)
				.values({ ...nextClientGroup, id: clientGroupId })
				.onConflictDoUpdate({ set: nextClientGroup, target: replicacheClientGroup.id });
		});

		yield* Effect.tryPromise(async () => {
			const nextClient = { clientGroupId, lastMutationId: nextMutationID };

			return database
				.insert(replicacheClient)
				.values({ ...nextClient, id: mutation.clientID })
				.onConflictDoUpdate({ set: nextClient, target: replicacheClient.id });
		});
	}).pipe(
		TransactionDatabase.provideTransaction,
		Effect.retry({
			while: (error) => {
				if (error !== "RETRY") {
					return false;
				}

				const shouldContinue = !errorMode;

				errorMode = true;

				return shouldContinue;
			},
		}),
	);
};

export const action = defineEffectAction(
	Effect.gen(function* () {
		const userService = yield* UserService;
		const user = yield* userService.getUser();

		if (!user) {
			return yield* Effect.die("unauthorized");
		}

		const request = yield* RemixRequest;
		const pushRequest = yield* Effect.tryPromise(async () => {
			return request.json() as Promise<PushRequest>;
		});

		if (pushRequest.pushVersion !== 1) {
			return yield* Effect.die("Unhandled push version");
		}

		yield* Effect.all(
			pushRequest.mutations.map((mutation) => {
				return processMutation({ clientGroupId: pushRequest.clientGroupID, mutation, user });
			}),
		);

		return json(null) as never;
	}),
);
