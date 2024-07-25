import type { ReactNode } from "react";
import type { ReadTransaction, WriteTransaction } from "replicache";

import { createContext, use, useContext, useEffect, useState } from "react";
import { Replicache } from "replicache";

const createReplicacheInstance = (userId: string) => {
	const replicache = new Replicache({
		licenseKey: import.meta.env["VITE_REPLICACHE_LICENSE_KEY"] as string,
		mutators: {
			clearValue: async (tx: WriteTransaction) => {
				await tx.del("value");
			},
			updateValue: async (tx: WriteTransaction, newValue: number) => {
				await tx.set("value", newValue);
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

	if (!replicacheInstance) return null;

	return (
		<ReplicacheContext key={userId} value={replicacheInstance}>
			{children}
		</ReplicacheContext>
	);
};

const EMPTY_DATA_SYMBOL = Symbol("EMPTY_DATA");

export const useReplicacheData = <T,>(readFunction: (tx: ReadTransaction) => Promise<T>) => {
	const replicacheClient = useContext(ReplicacheContext);

	if (!replicacheClient) throw new Error("Lorem Ipsum");

	// eslint-disable-next-line react/hook-use-state -- I want this
	const [initialDataPromise] = useState(async () => replicacheClient.query(readFunction));

	const initialData = use(initialDataPromise);

	const [data, setData] = useState<T | typeof EMPTY_DATA_SYMBOL>(EMPTY_DATA_SYMBOL);

	useEffect(() => {
		const unsubscribe = replicacheClient.subscribe(readFunction, {
			onData: data => {
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

	if (!replicacheClient) throw new Error("Lorem Ipsum");

	return replicacheClient.mutate;
};
