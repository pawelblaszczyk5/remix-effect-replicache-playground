import type { MutationV1, PushRequest } from "replicache";

import { Effect } from "effect";

import { and, eq, TransactionDatabase } from "@repo/database";
import { replicacheClientGroup } from "@repo/database/schema";
import { defineEffectAction } from "@repo/effect-runtime";
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
			return database
				.select()
				.from(replicacheClientGroup)
				.where(and(eq(replicacheClientGroup.id, clientGroupId), eq(replicacheClientGroup.userId, user)))
				.get();
		}).pipe(
			Effect.map((clientGroup) => {
				return clientGroup ?? { cvrVersion: 0, id: clientGroupId, userId: user };
			}),
		);

		yield* Effect.log(clientGroup, mutation, errorMode);
	}).pipe(
		TransactionDatabase.provideTransaction,
		Effect.retry({
			until: () => {
				const shouldStop = errorMode;

				errorMode = true;

				return shouldStop;
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

		if (pushRequest.pushVersion === 0) {
			return yield* Effect.die("Unhandled push version");
		}

		yield* Effect.all(
			pushRequest.mutations.map((mutation) => {
				return processMutation({ clientGroupId: pushRequest.clientGroupID, mutation, user });
			}),
		);

		yield* Effect.fail("Implement further");

		return null;
	}),
);
