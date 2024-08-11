import type { ReactNode } from "react";
import type { ReadTransaction, WriteTransaction } from "replicache";

import { customAlphabet } from "nanoid";
import { createContext, use, useContext, useEffect, useState } from "react";
import { Replicache } from "replicache";

import { invariant } from "@repo/invariant";

const nanoid = customAlphabet(
	/* cspell:disable-next-line */
	"123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz",
	24,
);

export type Todo = {
	completed: boolean;
	id: string;
	owner: string;
	private: boolean;
	text: string;
};

const createReplicacheInstance = (userId: string) => {
	const replicache = new Replicache({
		licenseKey: import.meta.env["VITE_REPLICACHE_LICENSE_KEY"] as string,
		mutators: {
			createTodo: async (tx: WriteTransaction, data: Pick<Todo, "private" | "text">) => {
				const id = nanoid();

				const todo = {
					...data,
					completed: false,
					id,
					owner: userId,
				} satisfies Todo;

				await tx.set(`todo/${id}`, todo);
			},
			deleteTodo: async (tx: WriteTransaction, id: Todo["id"]) => {
				await tx.del(`todo/${id}`);
			},
			updateTodoCompletion: async (tx: WriteTransaction, data: Pick<Todo, "completed" | "id">) => {
				const todo = await tx.get<Todo>(`todo/${data.id}`);

				invariant(todo);

				const updatedTodo = {
					...todo,
					completed: data.completed,
				} satisfies Todo;

				await tx.set(`todo/${data.id}`, updatedTodo);
			},
			updateTodoText: async (tx: WriteTransaction, data: Pick<Todo, "id" | "text">) => {
				const todo = await tx.get<Todo>(`todo/${data.id}`);

				invariant(todo);

				const updatedTodo = {
					...todo,
					text: data.text,
				} satisfies Todo;

				await tx.set(`todo/${data.id}`, updatedTodo);
			},
		},
		name: userId,
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
