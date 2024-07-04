import type { MetaFunction } from "@remix-run/node";

import { useLoaderData } from "@remix-run/react";
import { Suspense, use } from "react";

import { defineLoader } from "#src/lib/remix.js";

export const meta = (() => [
	{ title: "New Remix App" },
	{ content: "Welcome to Remix!", name: "description" },
]) satisfies MetaFunction;

export const loader = defineLoader(async () => {
	const date = new Promise<Date>(resolve => {
		setTimeout(() => {
			resolve(new Date());
		}, 3_000);
	});

	return { date };
});

const Test = ({ datePromise }: Readonly<{ datePromise: Promise<Date> }>) => {
	const date = use(datePromise);

	return <p>{date.toISOString()}</p>;
};

const IndexAppRoute = () => {
	const { date } = useLoaderData<typeof loader>();

	return (
		<div>
			<h1>Hello world</h1>
			<Suspense fallback={<p>Loading...</p>}>
				<Test datePromise={date} />
			</Suspense>
		</div>
	);
};

export default IndexAppRoute;
