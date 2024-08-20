import { useMatches } from "@remix-run/react";

import { generateId } from "@repo/id";
import { invariant } from "@repo/invariant";
import type { Todo } from "@repo/mutators-types";

import { useReplicacheData, useReplicacheMutation } from "#src/lib/replicache.client.js";

export const useCurrentUser = () => {
	const matches = useMatches();
	const match = matches[1];

	invariant(match);

	const currentUser = (match.data as { user: string }).user;

	return currentUser;
};

export const useTodos = () => {
	return useReplicacheData(async (tx) => {
		const items = await tx.scan<Todo>({ prefix: "todo/" }).toArray();

		return items.toSorted((a, b) => {
			return a.createdAt - b.createdAt;
		});
	});
};

export const useCreateTodo = () => {
	const { createTodo } = useReplicacheMutation();

	const currentUser = useCurrentUser();

	return async (data: Pick<Todo, "isPrivate" | "text">) => {
		return createTodo({ ...data, createdAt: Date.now(), id: generateId(), owner: currentUser });
	};
};

export const useDeleteTodo = () => {
	const { deleteTodo } = useReplicacheMutation();

	return async (id: Todo["id"]) => {
		return deleteTodo(id);
	};
};

export const useUpdateTodoCompletion = () => {
	const { updateTodoCompletion } = useReplicacheMutation();

	return async (data: Pick<Todo, "id" | "isCompleted">) => {
		return updateTodoCompletion(data);
	};
};
