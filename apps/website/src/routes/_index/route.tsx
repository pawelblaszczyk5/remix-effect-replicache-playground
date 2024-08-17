import { Link, useLoaderData } from "@remix-run/react";
import { Effect } from "effect";

import { css } from "@repo/css";
import { defineEffectLoader } from "@repo/effect-runtime";
import { UserService } from "@repo/user-service";

export const loader = defineEffectLoader(
	Effect.gen(function* () {
		const userService = yield* UserService;
		const user = yield* userService.getUser();
		const greeting = yield* userService.greet();

		return { greeting, user };
	}),
);

const Route = () => {
	const { greeting, user } = useLoaderData<typeof loader>();

	return (
		<>
			<title>Example home page</title>
			<meta content="Welcome to example!" name="description" />
			<h1
				style={css({
					color: "blue",
					on: ($) => {
						return [$("hover", { color: "red" })];
					},
				})}
			>
				{greeting}
			</h1>
			<div>
				{user ? (
					<Link prefetch="render" to={{ pathname: "/logout" }}>
						Logout form
					</Link>
				) : (
					<Link prefetch="render" to={{ pathname: "/login" }}>
						Login form
					</Link>
				)}
			</div>
			<div>
				<Link prefetch="render" to={{ pathname: "/app" }}>
					Go to app
				</Link>
			</div>
		</>
	);
};

export default Route;
