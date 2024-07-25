import { useReplicacheData, useReplicacheMutation } from "#src/lib/replicache.client.js";

const getRandomInt = (max: number) => Math.floor(Math.random() * max);

const AppRoute = () => {
	const data = useReplicacheData(async tx => tx.get<number>("value"));
	const { clearValue, updateValue } = useReplicacheMutation();

	return (
		<div style={{ alignItems: "start", display: "flex", flexDirection: "column" }}>
			<h1>Hello root app</h1>
			<p>Current value: {data ?? "No value yet"}</p>
			<button onClick={async () => updateValue(getRandomInt(500))} type="button">
				Update value
			</button>
			<button onClick={async () => clearValue()} type="button">
				Clear value
			</button>
		</div>
	);
};

export default AppRoute;
