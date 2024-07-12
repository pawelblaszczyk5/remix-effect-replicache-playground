import type { ActionFunctionArgs, LoaderFunctionArgs, TypedDeferredData } from "@remix-run/node";
import type { Scope } from "effect";

import { unstable_defineAction, unstable_defineLoader } from "@remix-run/node";
import { Context, Effect, Layer, Logger, ManagedRuntime } from "effect";

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions -- better readability
interface TodoService {
	getTodo: () => Promise<string>;
}

export const TodoService = Context.GenericTag<TodoService>("@todofall/website#TodoService");

const TodoServiceLive = Layer.succeed(
	TodoService,
	TodoService.of({
		getTodo: async () =>
			new Promise(resolve => {
				setTimeout(() => {
					resolve(new Date().toISOString());
				}, 1_000);
			}),
	}),
);

const AppLayer = Layer.mergeAll(TodoServiceLive, Logger.pretty);

const runtime = ManagedRuntime.make(AppLayer);

export const RemixRequest = Context.GenericTag<Request>("@todofall/website#RemixRequest");

const makeRequestContext = ({ request }: ActionFunctionArgs | LoaderFunctionArgs) => {
	const layer = Context.empty().pipe(Context.add(RemixRequest, request), Layer.succeedContext);

	return layer;
};

type AppEnvironment = Layer.Layer.Success<typeof AppLayer>;
type RequestEnvironment = Layer.Layer.Success<ReturnType<typeof makeRequestContext>> | Scope.Scope;

type Serializable =
	| Exclude<ReturnType<Parameters<typeof unstable_defineLoader>[0]>, Promise<any> | Response | TypedDeferredData<any>>
	| Promise<Serializable>;

type UnwrapNestedPromise<Value> = Value extends Promise<infer AwaitedValue> ? AwaitedValue : Value;

export const defineEffectLoader = <
	Success extends Serializable,
	Error,
	Requirements extends AppEnvironment | RequestEnvironment,
>(
	effect: Effect.Effect<Success, Error, Requirements>,
) =>
	unstable_defineLoader(async (parameters: LoaderFunctionArgs) => {
		const program = effect.pipe(Effect.provide(makeRequestContext(parameters)), Effect.scoped);

		return runtime.runPromise(program) as UnwrapNestedPromise<Success>;
	});

export const defineEffectAction = <
	Success extends Serializable,
	Error,
	Requirements extends AppEnvironment | RequestEnvironment,
>(
	effect: Effect.Effect<Success, Error, Requirements>,
) =>
	unstable_defineAction(async (parameters: ActionFunctionArgs) => {
		const program = effect.pipe(Effect.provide(makeRequestContext(parameters)), Effect.scoped);

		return runtime.runPromise(program) as UnwrapNestedPromise<Success>;
	});
