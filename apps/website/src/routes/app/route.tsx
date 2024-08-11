import type { ClientLoaderFunctionArgs } from "@remix-run/react";

import { Outlet, useLoaderData } from "@remix-run/react";
import { Effect } from "effect";

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

		return user;
	}),
);

export const clientLoader = async ({ serverLoader }: ClientLoaderFunctionArgs) => {
	const data = await serverLoader<typeof loader>();

	if (typeof data === "object") {
		// eslint-disable-next-line @typescript-eslint/only-throw-error -- it's fine there
		throw data;
	}

	return { user: data };
};

clientLoader.hydrate = true;

const Route = () => {
	const { user } = useLoaderData<typeof clientLoader>();

	return (
		<ReplicacheProvider userId={user}>
			<title>App</title>
			<Outlet />
		</ReplicacheProvider>
	);
};

export const HydrateFallback = () => {
	return <h1>Loading...</h1>;
};

export default Route;
