import { Link, useLoaderData } from "@remix-run/react";
import { Effect } from "effect";

import { css } from "@repo/css";
import { defineEffectLoader } from "@repo/effect-runtime";
import { ExampleService } from "@repo/example-service";

export const loader = defineEffectLoader(
	Effect.gen(function* () {
		const exampleService = yield* ExampleService;

		return yield* exampleService.greet();
	}),
);

const IndexAppRoute = () => {
	const greeting = useLoaderData<typeof loader>();

	return (
		<>
			<title>Example home page</title>
			<meta content="Welcome to example!" name="description" />
			<div>
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
				<Link prefetch="render" to={{ pathname: "/app" }}>
					Go to app
				</Link>
			</div>
		</>
	);
};

export default IndexAppRoute;
