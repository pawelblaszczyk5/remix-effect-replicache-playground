import type { ReactNode } from "react";
import type { ReadTransaction, WriteTransaction } from "replicache";

import { createContext, use, useContext, useEffect, useState } from "react";
import { Replicache } from "replicache";

import { invariant } from "@repo/invariant";
import type { CreateTodoData, DeleteTodoData, Todo, UpdateTodoCompletionData } from "@repo/mutators-types";

const createReplicacheInstance = (userId: string) => {
	const replicache = new Replicache({
		licenseKey: import.meta.env["VITE_REPLICACHE_LICENSE_KEY"] as string,
		mutators: {
			createTodo: async (tx: WriteTransaction, data: CreateTodoData) => {
				const todo = {
					...data,
					isCompleted: false,
				} satisfies Todo;

				await tx.set(`todo/${data.id}`, todo);
			},
			deleteTodo: async (tx: WriteTransaction, id: DeleteTodoData) => {
				const todo = await tx.get<Todo>(`todo/${id}`);

				invariant(todo && todo.owner === userId);

				await tx.del(`todo/${id}`);
			},
			updateTodoCompletion: async (tx: WriteTransaction, data: UpdateTodoCompletionData) => {
				const todo = await tx.get<Todo>(`todo/${data.id}`);

				invariant(todo);

				const updatedTodo = {
					...todo,
					isCompleted: data.isCompleted,
				} satisfies Todo;

				await tx.set(`todo/${data.id}`, updatedTodo);
			},
		},
		name: userId,
		pullInterval: 10 * 1_000,
		pullURL: "/api/pull",
		pushURL: "/api/push",
	});

	return replicache;
};

type ReplicacheInstance = ReturnType<typeof createReplicacheInstance>;

const ReplicacheContext = createContext<null | ReplicacheInstance>(null);

export const ReplicacheProvider = ({ children, userId }: { readonly children: ReactNode; readonly userId: string }) => {
	const [replicacheInstance, setReplicacheInstance] = useState<null | ReplicacheInstance>(null);
	const [previousUserId, setPreviousUserId] = useState<null | string>(null);

	if (userId !== previousUserId) {
		setPreviousUserId(userId);
		void replicacheInstance?.close();
		setReplicacheInstance(createReplicacheInstance(userId));
	}

	if (!replicacheInstance) {
		return null;
	}

	return (
		<ReplicacheContext key={userId} value={replicacheInstance}>
			{children}
		</ReplicacheContext>
	);
};

const EMPTY_DATA_SYMBOL = Symbol("EMPTY_DATA");

export const useReplicacheData = <T,>(readFunction: (tx: ReadTransaction) => Promise<T>) => {
	const replicacheClient = useContext(ReplicacheContext);

	if (!replicacheClient) {
		throw new Error("Lorem Ipsum");
	}

	// eslint-disable-next-line react/hook-use-state -- I want this
	const [initialDataPromise] = useState(async () => {
		return replicacheClient.query(readFunction);
	});

	const initialData = use(initialDataPromise);

	const [data, setData] = useState<T | typeof EMPTY_DATA_SYMBOL>(EMPTY_DATA_SYMBOL);

	useEffect(() => {
		const unsubscribe = replicacheClient.subscribe(readFunction, {
			onData: (data) => {
				setData(data);
			},
		});

		return () => {
			unsubscribe();
		};
	}, [readFunction, replicacheClient]);

	return data === EMPTY_DATA_SYMBOL ? initialData : data;
};

export const useReplicacheMutation = () => {
	const replicacheClient = useContext(ReplicacheContext);

	if (!replicacheClient) {
		throw new Error("Lorem Ipsum");
	}

	return replicacheClient.mutate;
};
