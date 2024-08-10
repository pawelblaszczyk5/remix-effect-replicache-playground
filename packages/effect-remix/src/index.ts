import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import type { UNSAFE_DataWithResponseInit as DataWithResponseInit } from "@remix-run/router";
import type { Layer } from "effect";

import { unstable_data, unstable_defineAction, unstable_defineLoader } from "@remix-run/node";
import { Effect, ManagedRuntime } from "effect";

type Serializable =
	| {
			[key: PropertyKey]: Serializable;
	  }
	| Array<Serializable>
	| bigint
	| boolean
	| Date
	| Error
	| Map<Serializable, Serializable>
	| null
	| number
	| Promise<Serializable>
	| RegExp
	| Set<Serializable>
	| string
	| symbol
	| undefined
	| URL;

type SerializableDataWithResponseInit = DataWithResponseInit<Serializable>;

export type CreateRequestContext<RequestEnvironment = any> = (
	args: Pick<ActionFunctionArgs | LoaderFunctionArgs, "params" | "request">,
) => Layer.Layer<RequestEnvironment>;

export type DefineEffectAction<AppEnvironment, RequestEnvironment> = <
	Success extends Serializable | SerializableDataWithResponseInit,
	Error,
	Requirements extends AppEnvironment | RequestEnvironment,
>(
	effect: Effect.Effect<Success, Error, Requirements>,
) => (args: ActionFunctionArgs) => Promise<Success>;

export type Data = <Data extends Serializable>(data: Data, init?: number | ResponseInit) => DataWithResponseInit<Data>;

export type DefineEffectLoader<AppEnvironment, RequestEnvironment> = <
	Success extends Serializable | SerializableDataWithResponseInit,
	Error,
	Requirements extends AppEnvironment | RequestEnvironment,
>(
	effect: Effect.Effect<Success, Error, Requirements>,
) => (args: LoaderFunctionArgs) => Promise<Success>;

export const createEffectRemixRuntime = <AppEnvironment, RequestEnvironment>(
	appContext: Layer.Layer<AppEnvironment>,
	createRequestContext: CreateRequestContext<RequestEnvironment>,
) => {
	const runtime = ManagedRuntime.make(appContext);

	const defineEffectLoader: DefineEffectLoader<AppEnvironment, RequestEnvironment> = (effect) => {
		return unstable_defineLoader(async ({ params, request }: LoaderFunctionArgs) => {
			const program = effect.pipe(Effect.provide(createRequestContext({ params, request })), Effect.scoped);

			return runtime.runPromise(program);
		});
	};

	const defineEffectAction: DefineEffectAction<AppEnvironment, RequestEnvironment> = (effect) => {
		return unstable_defineAction(async ({ params, request }: LoaderFunctionArgs) => {
			const program = effect.pipe(Effect.provide(createRequestContext({ params, request })), Effect.scoped);

			return runtime.runPromise(program);
		});
	};

	const data: Data = unstable_data;

	return { data, defineEffectAction, defineEffectLoader };
};

export { type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/node";

export { type UNSAFE_DataWithResponseInit as DataWithResponseInit } from "@remix-run/router";
