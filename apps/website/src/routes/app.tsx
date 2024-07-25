import { Outlet } from "@remix-run/react";

import { ReplicacheProvider } from "#src/lib/replicache.client.js";

export const clientLoader = () => null;

const AppLayout = () => (
	<ReplicacheProvider userId="John Doe">
		<title>App</title>
		<Outlet />
	</ReplicacheProvider>
);

export const HydrateFallback = () => <h1>Loading...</h1>;

export default AppLayout;
