import type { Todo } from "#src/lib/replicache.client.js";

import { useReplicacheData, useReplicacheMutation } from "#src/lib/replicache.client.js";

const Route = () => {
	const data = useReplicacheData(async (tx) => {
		return tx.scan<Todo>({ prefix: "todo/" }).toArray();
	});

	const { createTodo, updateTodoCompletion, updateTodoText } = useReplicacheMutation();

	console.log(data);

	return (
		<div style={{ alignItems: "start", display: "flex", flexDirection: "column" }}>
			<h1>Hello root app</h1>
		</div>
	);
};

export default Route;
