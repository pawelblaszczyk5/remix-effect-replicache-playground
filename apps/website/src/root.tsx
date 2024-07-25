import type { LinksFunction } from "@remix-run/node";

import { Links, Meta, Outlet, Scripts, ScrollRestoration } from "@remix-run/react";

import { styleSheet } from "@todofall/css";
import cssResetStylesheet from "@todofall/css-reset?url";

export const links = (() => {
	return [
		{
			href: cssResetStylesheet,
			rel: "stylesheet",
		},
	];
}) satisfies LinksFunction;

export const Layout = ({ children }: Readonly<{ children: React.ReactNode }>) => {
	return (
		<html lang="en">
			<head>
				<meta charSet="utf-8" />
				<meta content="width=device-width, initial-scale=1" name="viewport" />
				<Meta />
				<Links />
				<style>{styleSheet()}</style>
			</head>
			<body>
				{children}
				<ScrollRestoration />
				<Scripts />
			</body>
		</html>
	);
};

const RootRoute = () => {
	return <Outlet />;
};

export default RootRoute;
