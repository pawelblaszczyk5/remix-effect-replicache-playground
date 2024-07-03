import { Links, Meta, Outlet, Scripts, ScrollRestoration } from "@remix-run/react";

export const Layout = ({ children }: { readonly children: React.ReactNode }) => (
	<html lang="en">
		<head>
			<meta charSet="utf-8" />
			<meta content="width=device-width, initial-scale=1" name="viewport" />
			<Meta />
			<Links />
		</head>
		<body>
			{children}
			<ScrollRestoration />
			<Scripts />
		</body>
	</html>
);

const RootRoute = () => <Outlet />;

export default RootRoute;
