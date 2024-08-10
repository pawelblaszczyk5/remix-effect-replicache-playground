import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import type { UNSAFE_DataWithResponseInit as DataWithResponseInit } from "@remix-run/router";
import type { Data, Layer } from "effect";

import { redirect, unstable_data, unstable_defineAction, unstable_defineLoader } from "@remix-run/node";
import { Cause, Effect, Either, Exit, ManagedRuntime, Match } from "effect";

import { Redirect } from "@repo/effect-errors";

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

export type Data = <Data extends Serializable>(data: Data, init?: number | ResponseInit) => DataWithResponseInit<Data>;

export type DefineEffectAction<AppEnvironment, RequestEnvironment> = <
	Success extends Serializable | SerializableDataWithResponseInit,
	Error,
	Requirements extends AppEnvironment | RequestEnvironment,
>(
	effect: Effect.Effect<Success, Error, Requirements>,
) => (args: ActionFunctionArgs) => Promise<Success>;

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

	const runRemixEffect = async <Success, Error, Requirements extends AppEnvironment | RequestEnvironment>(
		effect: Effect.Effect<Success, Error, Requirements>,
		{ params, request }: ActionFunctionArgs | LoaderFunctionArgs,
	) => {
		const program = effect.pipe(Effect.provide(createRequestContext({ params, request })));
		const result = await runtime.runPromiseExit(program);

		if (Exit.isSuccess(result)) {
			return result.value;
		}

		const failureOrCause = Cause.failureOrCause(result.cause);

		if (Either.isRight(failureOrCause)) {
			throw new Error("Unexpected error", { cause: failureOrCause.right });
		}

		const throwable = Match.value(failureOrCause.left).pipe(
			Match.when(Match.instanceOf(Redirect), (redirectError) => {
				return redirect(redirectError.url, redirectError.init);
			}),
			Match.orElse((error) => {
				return new Error("Unexpected error", { cause: error });
			}),
		);

		// eslint-disable-next-line @typescript-eslint/only-throw-error -- it's fine there
		throw throwable;
	};

	const defineEffectLoader: DefineEffectLoader<AppEnvironment, RequestEnvironment> = (effect) => {
		return unstable_defineLoader(async (args: LoaderFunctionArgs) => {
			return runRemixEffect(effect, args);
		});
	};

	const defineEffectAction: DefineEffectAction<AppEnvironment, RequestEnvironment> = (effect) => {
		return unstable_defineAction(async (args: ActionFunctionArgs) => {
			return runRemixEffect(effect, args);
		});
	};

	const data: Data = unstable_data;

	return { data, defineEffectAction, defineEffectLoader };
};

export { type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/node";

export { type UNSAFE_DataWithResponseInit as DataWithResponseInit } from "@remix-run/router";
