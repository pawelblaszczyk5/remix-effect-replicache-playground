import type { Cookie, PullRequest, PullRequestV1, PullResponseOKV1 } from "replicache";

import { json } from "@remix-run/react";
import { Effect, Option } from "effect";

import {
	Cvr,
	findAllChangedTodos,
	findAllReplicacheClientsByClientGroup,
	findAllTodosForCvr,
	findCvrById,
	findReplicacheClientGroupById,
	insertCvr,
	ReplicacheClientGroup,
	SqliteClient,
	upsertReplicacheClientGroup,
} from "@repo/database";
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
		const baseCvr = previousCvr ?? { entities: {}, id: "", lastMutationIds: {} };

		const clientGroup = Option.getOrElse(yield* findReplicacheClientGroupById(pullRequest.clientGroupID), () => {
			return ReplicacheClientGroup.make({ cvrVersion: 0, id: pullRequest.clientGroupID, userId: user });
		});

		if (clientGroup.userId !== user) {
			yield* Effect.fail("UNAUTHORIZED");
		}

		const allTodos = yield* findAllTodosForCvr(user);

		const clients = yield* findAllReplicacheClientsByClientGroup(pullRequest.clientGroupID);

		const nextCvr = Cvr.make({
			entities: {},
			id: generateId(),
			lastMutationIds: {},
		});

		allTodos.forEach((todo) => {
			// @ts-expect-error -- it's readonly in theory
			nextCvr.entities[`todo/${todo.id}`] = todo.version;
		});

		clients.forEach((client) => {
			// @ts-expect-error -- it's readonly in theory
			nextCvr.lastMutationIds[client.id] = client.lastMutationId;
		});

		const cvrDiff = diffCvr(baseCvr, nextCvr);

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

		const changedEntities = yield* findAllChangedTodos(changedTodosIds);

		const changedClients = clients.filter((client) => {
			return cvrDiff.clients.includes(client.id);
		});

		const orderFromCookie = typeof pullRequest.cookie === "object" ? pullRequest.cookie?.order : undefined;

		if (typeof orderFromCookie === "string") {
			return yield* Effect.die("Incorrect order in cookie");
		}

		const nextCvrVersion = Math.max(orderFromCookie ?? 0, clientGroup.cvrVersion) + 1;

		yield* upsertReplicacheClientGroup({
			cvrVersion: nextCvrVersion,
			id: pullRequest.clientGroupID,
			userId: user,
		});

		yield* insertCvr(nextCvr);
		return {
			changedClients,
			changedEntities,
			cvrDiff,
			nextCvr,
			nextCvrVersion,
		};
	});
};

const getPreviousCvr = (cookie: Cookie) => {
	return Effect.gen(function* () {
		if (typeof cookie !== "object" || cookie === null) {
			return Option.none();
		}

		if (!("cvrId" in cookie)) {
			return Option.none();
		}

		const cvrId = cookie["cvrId"];

		if (typeof cvrId !== "string") {
			return Option.none();
		}

		return yield* findCvrById(cvrId);
	});
};

export const action = defineEffectAction(
	Effect.gen(function* () {
		const sql = yield* SqliteClient.SqliteClient;
		const userService = yield* UserService;

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

		const previousCvr = Option.getOrUndefined(yield* getPreviousCvr(pullRequest.cookie));

		const result = yield* processPull({ previousCvr, pullRequest, user }).pipe(sql.withTransaction);

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

			response.patch.push({ key: idWithPrefix, op: "put", value: { ...todo, createdAt: todo.createdAt.epochMillis } });
		});

		return json(response) as never;
	}),
);
