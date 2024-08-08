import { Outlet } from "@remix-run/react";

import { ReplicacheProvider } from "#src/lib/replicache.client.js";

export const clientLoader = () => {
	return null;
};

const Route = () => {
	return (
		<ReplicacheProvider userId="John Doe">
			<title>App</title>
			<Outlet />
		</ReplicacheProvider>
	);
};

export const HydrateFallback = () => {
	return <h1>Loading...</h1>;
};

export default Route;
