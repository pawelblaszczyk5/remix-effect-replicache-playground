import type { MetaFunction } from "@remix-run/node";

export const meta = (() => [
	{ title: "New Remix App" },
	{ content: "Welcome to Remix!", name: "description" },
]) satisfies MetaFunction;

const IndexAppRoute = () => <h1>Hello world</h1>;

export default IndexAppRoute;
