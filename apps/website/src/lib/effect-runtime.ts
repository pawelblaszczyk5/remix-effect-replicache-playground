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

export const ServerRequest = Context.GenericTag<Request>("@todofall/website#ServerRequest");

const makeRequestContext = ({ request }: ActionFunctionArgs | LoaderFunctionArgs) => {
	const layer = Context.empty().pipe(Context.add(ServerRequest, request), Layer.succeedContext);

	return layer;
};

type AppEnvironment = Layer.Layer.Success<typeof AppLayer>;
type RequestEnvironment = Layer.Layer.Success<ReturnType<typeof makeRequestContext>> | Scope.Scope;

type Serializable =
	| Exclude<ReturnType<Parameters<typeof unstable_defineLoader>[0]>, Promise<any> | Response | TypedDeferredData<any>>
	| Promise<Serializable>;

export const defineEffectLoader = <A extends Serializable, E, R extends AppEnvironment | RequestEnvironment>(
	effect: Effect.Effect<A, E, R>,
) =>
	unstable_defineLoader(async parameters => {
		const program = effect.pipe(Effect.provide(makeRequestContext(parameters)), Effect.scoped);

		return runtime.runPromise(program);
	}) as (arguments_: LoaderFunctionArgs) => Promise<A>;

export const defineEffectAction = <A extends Serializable, E, R extends AppEnvironment | RequestEnvironment>(
	effect: Effect.Effect<A, E, R>,
) =>
	unstable_defineAction(async parameters => {
		const program = effect.pipe(Effect.provide(makeRequestContext(parameters)), Effect.scoped);

		return runtime.runPromise(program);
	}) as (arguments_: ActionFunctionArgs) => Promise<A>;
