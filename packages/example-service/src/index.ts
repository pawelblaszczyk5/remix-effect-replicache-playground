import { Context, Effect, Layer } from "effect";

const makeExampleServiceLive = () => {
	return {
		greet: (name?: string) => {
			return Effect.gen(function* () {
				if (name) return `Hello ${name}!`;

				yield* Effect.log("Anonymous user visited!");

				return "Hello stranger!";
			});
		},
	};
};

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions -- prevent intellisense expanding
export interface ExampleService extends ReturnType<typeof makeExampleServiceLive> {}

export const ExampleService = Context.GenericTag<ExampleService>("@repo/example-service#ExampleService");

export const ExampleServiceLive = Layer.succeed(ExampleService, makeExampleServiceLive());
