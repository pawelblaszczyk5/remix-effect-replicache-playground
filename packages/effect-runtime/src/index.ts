import type { ActionFunctionArgs, LoaderFunctionArgs, TypedDeferredData } from "@remix-run/node";
import type { Scope } from "effect";

import { unstable_defineAction, unstable_defineLoader } from "@remix-run/node";
import { Context, Effect, Layer, Logger, ManagedRuntime } from "effect";

import { ExampleServiceLive } from "@todofall/example-service";

const AppLayer = Layer.mergeAll(Logger.pretty, ExampleServiceLive);

const runtime = ManagedRuntime.make(AppLayer);

export const RemixRequest = Context.GenericTag<Request>("@todofall/effect-runtime#RemixRequest");

const makeRequestContext = ({ request }: ActionFunctionArgs | LoaderFunctionArgs) => {
	const layer = Context.empty().pipe(Context.add(RemixRequest, request), Layer.succeedContext);

	return layer;
};

type AppEnvironment = Layer.Layer.Success<typeof AppLayer>;
type RequestEnvironment = Layer.Layer.Success<ReturnType<typeof makeRequestContext>> | Scope.Scope;

type Environment = AppEnvironment | RequestEnvironment;

type Serializable =
	| Exclude<ReturnType<Parameters<typeof unstable_defineLoader>[0]>, Promise<any> | Response | TypedDeferredData<any>>
	| Promise<Serializable>;

type UnwrapNestedPromise<Value> = Value extends Promise<infer AwaitedValue> ? AwaitedValue : Value;

export const defineEffectLoader = <Success extends Serializable, Error, Requirements extends Environment>(
	effect: Effect.Effect<Success, Error, Requirements>,
) => {
	return unstable_defineLoader(async (parameters: LoaderFunctionArgs) => {
		const program = effect.pipe(Effect.provide(makeRequestContext(parameters)), Effect.scoped);

		return runtime.runPromise(program) as UnwrapNestedPromise<Success>;
	});
};

export const defineEffectAction = <Success extends Serializable, Error, Requirements extends Environment>(
	effect: Effect.Effect<Success, Error, Requirements>,
) => {
	return unstable_defineAction(async (parameters: ActionFunctionArgs) => {
		const program = effect.pipe(Effect.provide(makeRequestContext(parameters)), Effect.scoped);

		return runtime.runPromise(program) as UnwrapNestedPromise<Success>;
	});
};
