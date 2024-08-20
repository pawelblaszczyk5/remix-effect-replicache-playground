import { Effect } from "effect";

import { defineEffectLoader } from "@repo/effect-runtime";
import { RemixRequest } from "@repo/request-context";
import { UserService } from "@repo/user-service";

import { eventStream, listenToUpdates } from "#src/lib/events.server.js";

export const loader = defineEffectLoader(
	Effect.gen(function* () {
		const userService = yield* UserService;
		const request = yield* RemixRequest;

		const user = yield* userService.getUser();

		if (!user) {
			return yield* Effect.die("unauthorized");
		}

		const response = eventStream(request, (send) => {
			listenToUpdates(request.signal, () => {
				send("update", "empty");
			});
		});

		return response as never;
	}),
);
