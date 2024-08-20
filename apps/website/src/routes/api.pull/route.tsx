import type { PullRequest, PullRequestV1, PullResponseOKV1 } from "replicache";

import { json } from "@remix-run/react";
import { Effect } from "effect";

import { Database, eq, inArray, or, TransactionDatabase } from "@repo/database";
import { cvr, replicacheClient, replicacheClientGroup, todo } from "@repo/database/schema";
import type { Cvr } from "@repo/database/schema";
import { defineEffectAction } from "@repo/effect-runtime";
import { generateId } from "@repo/id";
import { RemixRequest } from "@repo/request-context";
import { UserService } from "@repo/user-service";

type EntityDiff = Array<[string, "del" | "put"]>;

type CvrDiff = {
	clients: Array<string>;
	entities: EntityDiff;
};

const diffCvr = (baseCvr: Cvr, nextCvr: Cvr) => {
	const diff: CvrDiff = {
		clients: [],
		entities: [],
	};

	Object.entries(nextCvr.entities).forEach(([entity, version]) => {
		const baseCvrEntityVersion = baseCvr.entities[entity];

		if (baseCvrEntityVersion === version) {
			return;
		}

		diff.entities.push([entity, "put"]);
	});

	Object.entries(baseCvr.entities).forEach(([entity]) => {
		const nextCvrEntityVersion = nextCvr.entities[entity];

		if (nextCvrEntityVersion !== undefined) {
			return;
		}

		diff.entities.push([entity, "del"]);
	});

	Object.entries(nextCvr.lastMutationIds).forEach(([clientId, lastMutationId]) => {
		const baseCvrClientLastMutationId = baseCvr.lastMutationIds[clientId];

		if (baseCvrClientLastMutationId === lastMutationId) {
			return;
		}

		diff.clients.push(clientId);
	});

	return diff;
};

const processPull = ({
	previousCvr,
	pullRequest,
	user,
}: {
	previousCvr: Cvr | undefined;
	pullRequest: PullRequestV1;
	user: string;
}) => {
	return Effect.gen(function* () {
		const database = yield* TransactionDatabase;

		const baseCvr = previousCvr ?? { entities: {}, id: "", lastMutationIds: {} };

		const clientGroup = yield* Effect.tryPromise(async () => {
			return database
				.select()
				.from(replicacheClientGroup)
				.where(eq(replicacheClientGroup.id, pullRequest.clientGroupID))
				.get();
		}).pipe(
			Effect.map((clientGroup) => {
				return clientGroup ?? { cvrVersion: 0, id: pullRequest.clientGroupID, userId: user };
			}),
		);

		if (clientGroup.userId !== user) {
			yield* Effect.fail("UNAUTHORIZED");
		}

		const allTodos = yield* Effect.tryPromise(async () => {
			return database
				.select({ id: todo.id, version: todo.version })
				.from(todo)
				.where(or(eq(todo.isPrivate, false), eq(todo.owner, user)))
				.all();
		});

		const clients = yield* Effect.tryPromise(async () => {
			return database
				.select()
				.from(replicacheClient)
				.where(eq(replicacheClient.clientGroupId, pullRequest.clientGroupID));
		});

		const nextCvr: Cvr = {
			entities: {},
			id: generateId(),
			lastMutationIds: {},
		};

		allTodos.forEach((todo) => {
			nextCvr.entities[`todo/${todo.id}`] = todo.version;
		});

		clients.forEach((client) => {
			nextCvr.lastMutationIds[client.id] = client.lastMutationId;
		});

		const cvrDiff = diffCvr(baseCvr, nextCvr);

		yield* Effect.log(cvrDiff);

		if (cvrDiff.clients.length === 0 && cvrDiff.entities.length === 0) {
			return null;
		}

		const changedTodosIds = cvrDiff.entities.flatMap(([idWithPrefix, operation]) => {
			if (operation === "del") {
				return [];
			}

			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- I'll need to do it better in final version
			const id = idWithPrefix.split("/")[1]!;

			return id;
		});

		const changedEntities = yield* Effect.tryPromise(async () => {
			return database
				.select({
					createdAt: todo.createdAt,
					id: todo.id,
					isCompleted: todo.isCompleted,
					isPrivate: todo.isPrivate,
					owner: todo.owner,
					text: todo.text,
				})
				.from(todo)
				.where(inArray(todo.id, changedTodosIds))
				.all();
		});
		const changedClients = clients.filter((client) => {
			return cvrDiff.clients.includes(client.id);
		});

		const orderFromCookie = typeof pullRequest.cookie === "object" ? pullRequest.cookie?.order : undefined;

		if (typeof orderFromCookie === "string") {
			return yield* Effect.die("Incorrect order in cookie");
		}

		const nextCvrVersion = Math.max(orderFromCookie ?? 0, clientGroup.cvrVersion) + 1;

		yield* Effect.tryPromise(async () => {
			const nextClientGroup = { cvrVersion: nextCvrVersion, userId: user };

			return database
				.insert(replicacheClientGroup)
				.values({ ...nextClientGroup, id: pullRequest.clientGroupID })
				.onConflictDoUpdate({ set: nextClientGroup, target: replicacheClientGroup.id });
		});

		yield* Effect.tryPromise(async () => {
			return database.insert(cvr).values(nextCvr);
		});

		return {
			changedClients,
			changedEntities,
			cvrDiff,
			nextCvr,
			nextCvrVersion,
		};
	}).pipe(TransactionDatabase.provideTransaction);
};

export const action = defineEffectAction(
	Effect.gen(function* () {
		const userService = yield* UserService;
		const database = yield* Database;

		const user = yield* userService.getUser();

		if (!user) {
			return yield* Effect.die("unauthorized");
		}

		const request = yield* RemixRequest;
		const pullRequest = yield* Effect.tryPromise(async () => {
			return request.json() as Promise<PullRequest>;
		});

		if (pullRequest.pullVersion !== 1) {
			return yield* Effect.die("Unhandled push version");
		}

		const previousCvr = yield* Effect.tryPromise(async () => {
			const cookie = pullRequest.cookie;

			if (typeof cookie !== "object" || cookie === null) {
				return undefined;
			}

			if (!("cvrId" in cookie)) {
				return undefined;
			}

			const cvrId = cookie["cvrId"];

			if (typeof cvrId !== "string") {
				return undefined;
			}

			return database.select().from(cvr).where(eq(cvr.id, cvrId)).get();
		});

		const result = yield* processPull({ previousCvr, pullRequest, user });

		if (result === null) {
			return json({
				cookie: pullRequest.cookie,
				lastMutationIDChanges: {},
				patch: [],
			} satisfies PullResponseOKV1) as never;
		}

		const response: PullResponseOKV1 = {
			cookie: { cvrId: result.nextCvr.id, order: result.nextCvrVersion },
			lastMutationIDChanges: Object.fromEntries(
				result.changedClients.map((client) => {
					return [client.id, client.lastMutationId];
				}),
			),
			patch: [],
		};

		if (previousCvr === undefined) {
			response.patch.push({ op: "clear" });
		}

		result.cvrDiff.entities.forEach(([idWithPrefix, operation]) => {
			if (operation === "del") {
        response.patch.push({ key: idWithPrefix, op: "del" });
        return;
			}

			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- I'll need to do it better in final version
			const id = idWithPrefix.split("/")[1]!;

			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- I'll need to do it better in final version
			const todo = result.changedEntities.find((todo) => {
				return todo.id === id;
			})!;

			response.patch.push({ key: idWithPrefix, op: "put", value: todo });
		});

		return json(response) as never;
	}),
);
