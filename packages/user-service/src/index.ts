import { Context, Effect, Layer } from "effect";

const makeUserServiceLive = () => {
	return {
		greet: (name?: string) => {
			return Effect.gen(function* () {
				if (name) {
					return `Hello ${name}!`;
				}

				yield* Effect.log("Anonymous user visited!");

				return "Hello stranger!";
			});
		},
	};
};

export class UserService extends Context.Tag("@repo/user-service#UserService")<
	UserService,
	ReturnType<typeof makeUserServiceLive>
>() {
	// eslint-disable-next-line fp/no-this -- ideally I'd disable it only for services files
	static readonly live = Layer.succeed(this, makeUserServiceLive());
}
