import { useMatches } from "@remix-run/react";
import { useId } from "react";

import { invariant } from "@repo/invariant";

import type { Todo } from "#src/lib/replicache.client.js";

import { useReplicacheData, useReplicacheMutation } from "#src/lib/replicache.client.js";

const TodoItem = ({ item }: { readonly item: Todo }) => {
	const matches = useMatches();
	const match = matches[1];

	invariant(match);

	const currentUser = (match.data as { user: string }).user;

	const { deleteTodo, updateTodoCompletion } = useReplicacheMutation();

	return (
		<li style={{ display: "flex", gap: 8 }}>
			<input
				onChange={async (event) => {
					await updateTodoCompletion({ id: item.id, isCompleted: event.currentTarget.checked });
				}}
				checked={item.isCompleted}
				type="checkbox"
			/>
			<p>{item.text}</p>
			{currentUser === item.owner && (
				<button
					onClick={async () => {
						return deleteTodo(item.id);
					}}
					type="button"
				>
					Delete todo
				</button>
			)}
		</li>
	);
};

const TodoForm = () => {
	const { createTodo } = useReplicacheMutation();

	const id = useId();

	return (
		<form
			action={async (formData) => {
				const isPrivate = Boolean(formData.get("isPrivate"));
				const text = String(formData.get("text"));

				await createTodo({ isPrivate, text });
			}}
		>
			<div style={{ display: "flex", gap: 8 }}>
				<label htmlFor={`${id}-text`}>Todo text</label>
				<input id={`${id}-text`} name="text" required={true} type="text" />
			</div>
			<div style={{ display: "flex", gap: 8 }}>
				<input id={`${id}-isPrivate`} name="isPrivate" type="checkbox" />
				<label htmlFor={`${id}-isPrivate`}>Is the todo private?</label>
			</div>
			<button type="submit">Add todo</button>
		</form>
	);
};

const Route = () => {
	const data = useReplicacheData(async (tx) => {
		const items = await tx.scan<Todo>({ prefix: "todo/" }).toArray();

		return items.toSorted((a, b) => {
			return a.createdAt - b.createdAt;
		});
	});

	return (
		<div style={{ alignItems: "center", display: "flex", flexDirection: "column", gap: 16 }}>
			<h1>All todo items</h1>
			<TodoForm />
			<ul>
				{data.map((todo) => {
					return <TodoItem item={todo} key={todo.id} />;
				})}
			</ul>
		</div>
	);
};

export default Route;
