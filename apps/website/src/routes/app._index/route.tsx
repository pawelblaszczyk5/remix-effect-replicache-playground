import { useReplicacheData, useReplicacheMutation } from "#src/lib/replicache.client.js";

const getRandomInt = (max: number) => {
	return Math.floor(Math.random() * max);
};

const Route = () => {
	const data = useReplicacheData(async (tx) => {
		return tx.get<number>("value");
	});
	const { clearValue, updateValue } = useReplicacheMutation();

	return (
		<div style={{ alignItems: "start", display: "flex", flexDirection: "column" }}>
			<h1>Hello root app</h1>
			<p>Current value: {data ?? "No value yet"}</p>
			<button
				onClick={async () => {
					return updateValue(getRandomInt(500));
				}}
				type="button"
			>
				Update value
			</button>
			<button
				onClick={async () => {
					return clearValue();
				}}
				type="button"
			>
				Clear value
			</button>
		</div>
	);
};

export default Route;
