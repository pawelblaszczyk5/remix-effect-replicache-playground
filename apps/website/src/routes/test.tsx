import { Await, Form, useActionData, useLoaderData } from "@remix-run/react";
import { Effect } from "effect";
import { Suspense } from "react";

import { TodoService, defineEffectAction, defineEffectLoader } from "#src/lib/effect-runtime.js";

export const loader = defineEffectLoader(
	Effect.gen(function* () {
		const todoService = yield* TodoService;

		return { test: todoService.getTodo() };
	}),
);

export const action = defineEffectAction(
	Effect.gen(function* () {
		const todoService = yield* TodoService;

		return { test: todoService.getTodo() };
	}),
);

const Route = () => {
	const { test } = useLoaderData<typeof loader>();
	const actionData = useActionData<typeof action>();

	return (
		<>
			<Suspense fallback={<h1>bla bla</h1>}>
				<Await resolve={test}>{data => <h1>{data}</h1>}</Await>
			</Suspense>
			{actionData && (
				<Suspense fallback={<h1>bla bla</h1>}>
					<Await resolve={actionData.test}>{data => <h1>{data}</h1>}</Await>
				</Suspense>
			)}
			<Form method="POST">
				<button type="submit">submit</button>
			</Form>
		</>
	);
};

export default Route;
