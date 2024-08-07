import type {
	ActionFunctionArgs,
	UNSAFE_DataWithResponseInit as DataWithResponseInit,
	LoaderFunctionArgs,
} from "@remix-run/node";
import type { Scope } from "effect";

import { unstable_defineAction, unstable_defineLoader } from "@remix-run/node";
import { Context, Effect, Layer, Logger, ManagedRuntime } from "effect";

import { ExampleServiceLive } from "@repo/example-service";

const AppLayer = Layer.mergeAll(Logger.pretty, ExampleServiceLive);

const runtime = ManagedRuntime.make(AppLayer);

export const RemixRequest = Context.GenericTag<Request>("@repo/effect-runtime#RemixRequest");

const makeRequestContext = ({ request }: ActionFunctionArgs | LoaderFunctionArgs) => {
	const layer = Context.empty().pipe(Context.add(RemixRequest, request), Layer.succeedContext);

	return layer;
};

type AppEnvironment = Layer.Layer.Success<typeof AppLayer>;
type RequestEnvironment = Layer.Layer.Success<ReturnType<typeof makeRequestContext>> | Scope.Scope;

type Environment = AppEnvironment | RequestEnvironment;

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

type UnwrapNestedPromise<Value> = Value extends Promise<infer AwaitedValue> ? AwaitedValue : Value;

export const defineEffectLoader = <
	Success extends Serializable | SerializableDataWithResponseInit,
	Error,
	Requirements extends Environment,
>(
	effect: Effect.Effect<Success, Error, Requirements>,
) => {
	return unstable_defineLoader(async (parameters: LoaderFunctionArgs) => {
		const program = effect.pipe(Effect.provide(makeRequestContext(parameters)), Effect.scoped);

		return runtime.runPromise(program) as UnwrapNestedPromise<Success>;
	});
};

export const defineEffectAction = <
	Success extends Serializable | SerializableDataWithResponseInit,
	Error,
	Requirements extends Environment,
>(
	effect: Effect.Effect<Success, Error, Requirements>,
) => {
	return unstable_defineAction(async (parameters: ActionFunctionArgs) => {
		const program = effect.pipe(Effect.provide(makeRequestContext(parameters)), Effect.scoped);

		return runtime.runPromise(program) as UnwrapNestedPromise<Success>;
	});
};

export { unstable_data as data } from "@remix-run/node";
