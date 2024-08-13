import { Outlet, useLoaderData } from "@remix-run/react";
import { Effect } from "effect";
import { Suspense, useSyncExternalStore } from "react";

import { Redirect } from "@repo/effect-errors";
import { defineEffectLoader } from "@repo/effect-runtime";
import { UserService } from "@repo/user-service";

import { ReplicacheProvider } from "#src/lib/replicache.client.js";

export const loader = defineEffectLoader(
	Effect.gen(function* () {
		const userService = yield* UserService;

		const user = yield* userService.getUser();

		if (!user) {
			return yield* new Redirect({ url: "/login" });
		}

		return { user };
	}),
);

const callback = () => {
	// eslint-disable-next-line @typescript-eslint/no-empty-function -- unneeded callback
	return () => {};
};

const useIsHydrated = () => {
	return useSyncExternalStore(
		callback,
		() => {
			return true;
		},
		() => {
			return false;
		},
	);
};

const Route = () => {
	const { user } = useLoaderData<typeof loader>();

	// NOTE I'm not really satisfied by this, I'll need to come up with something better in the final implementation
	const isHydrated = useIsHydrated();

	if (!isHydrated) {
		return <h1>Loading...</h1>;
	}

	return (
		<Suspense fallback={<h1>Loading...</h1>}>
			<ReplicacheProvider userId={user}>
				<title>App</title>
				<Outlet />
			</ReplicacheProvider>
		</Suspense>
	);
};

export default Route;
