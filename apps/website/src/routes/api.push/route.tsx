import type { MutationV1, PushRequest } from "replicache";

import { json } from "@remix-run/react";
import { Effect, Match, Option } from "effect";

import {
	deleteTodo,
	findReplicacheClientById,
	findReplicacheClientGroupById,
	insertTodo,
	ReplicacheClient,
	ReplicacheClientGroup,
	SqliteClient,
	updateTodoCompletion,
	upsertReplicacheClient,
	upsertReplicacheClientGroup,
} from "@repo/database";
import { defineEffectAction } from "@repo/effect-runtime";
import type { CreateTodoData, DeleteTodoData, UpdateTodoCompletionData } from "@repo/mutators-types";
import { RemixRequest } from "@repo/request-context";
import { UserService } from "@repo/user-service";

import { sendGlobalUpdate } from "#src/lib/events.server.js";

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
		const clientGroup = Option.getOrElse(yield* findReplicacheClientGroupById(clientGroupId), () => {
			return ReplicacheClientGroup.make({ cvrVersion: 0, id: clientGroupId, userId: user });
		});

		if (clientGroup.userId !== user) {
			yield* Effect.fail("UNAUTHORIZED");
		}

		const client = Option.getOrElse(yield* findReplicacheClientById(mutation.clientID), () => {
			return ReplicacheClient.make({ clientGroupId, id: mutation.clientID, lastMutationId: 0 });
		});

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

							yield* insertTodo({
								createdAt: undefined,
								id: data.id,
								isCompleted: false,
								isPrivate: data.isPrivate,
								owner: user,
								text: data.text,
								version: 1,
							});
						});
					}),
					Match.when({ name: "deleteTodo" }, () => {
						return Effect.gen(function* () {
							const data = mutation.args as DeleteTodoData;

							const result = yield* deleteTodo({ id: data, owner: user });

							if (result.rowsAffected === 0) {
								yield* Effect.fail("Nonexistent todo");
							}
						});
					}),
					Match.when({ name: "updateTodoCompletion" }, (mutation) => {
						return Effect.gen(function* () {
							const data = mutation.args as UpdateTodoCompletionData;

							const result = yield* updateTodoCompletion({
								id: data.id,
								isCompleted: data.isCompleted,
								owner: user,
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

		yield* upsertReplicacheClientGroup({
			cvrVersion: clientGroup.cvrVersion,
			id: clientGroupId,
			userId: user,
		});

		yield* upsertReplicacheClient({
			clientGroupId,
			id: mutation.clientID,
			lastMutationId: nextMutationID,
		});
	}).pipe(
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
		const sql = yield* SqliteClient.SqliteClient;

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
				return processMutation({ clientGroupId: pushRequest.clientGroupID, mutation, user }).pipe(sql.withTransaction);
			}),
		);

		sendGlobalUpdate();

		return json(null) as never;
	}),
);
