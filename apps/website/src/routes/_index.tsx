import { Link, useLoaderData } from "@remix-run/react";
import { Effect } from "effect";

import { css } from "@todofall/css";
import { defineEffectLoader } from "@todofall/effect-runtime";
import { ExampleService } from "@todofall/example-service";

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
				<h1 style={css({ color: "blue", on: ($) => [$("hover", { color: "red" })] })}>{greeting}</h1>
				<Link prefetch="render" to={{ pathname: "/app" }}>
					Go to app
				</Link>
			</div>
		</>
	);
};

export default IndexAppRoute;
