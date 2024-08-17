import { useId } from "react";

import type { Todo } from "#src/lib/replicache.client.js";

import { useCreateTodo, useCurrentUser, useDeleteTodo, useTodos, useUpdateTodoCompletion } from "#src/lib/state.js";

const TodoItem = ({ item }: { readonly item: Todo }) => {
	const currentUser = useCurrentUser();
	const updateTodoCompletion = useUpdateTodoCompletion();
	const deleteTodo = useDeleteTodo();

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
	const createTodo = useCreateTodo();

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
	const data = useTodos();

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
