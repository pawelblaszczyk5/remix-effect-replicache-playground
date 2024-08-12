import { Outlet, useLoaderData } from "@remix-run/react";
import { Effect } from "effect";
import { startTransition, useEffect, useState } from "react";

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

const Route = () => {
	const { user } = useLoaderData<typeof loader>();

	const [isHydrated, setIsHydrated] = useState(false);

	useEffect(() => {
		startTransition(() => {
			setIsHydrated(true);
		});
	}, []);

	if (!isHydrated) {
		return <h1>Loading...</h1>;
	}

	return (
		<ReplicacheProvider userId={user}>
			<title>App</title>
			<Outlet />
		</ReplicacheProvider>
	);
};

export default Route;
