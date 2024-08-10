import { createFileSessionStorage } from "@remix-run/node";
import { Context, Duration, Effect, Layer } from "effect";

import { RemixRequest } from "@repo/request-context";

const makeUserServiceLive = () => {
	const { commitSession, destroySession, getSession } = createFileSessionStorage<
		{ name: string },
		Record<never, string>
	>({
		cookie: {
			httpOnly: true,
			maxAge: Duration.days(10).pipe(Duration.toSeconds),
			name: "__session__",
			path: "/",
			sameSite: "lax",
			secure: true,
		},
		dir: "./sessions",
	});

	const getUser = () => {
		return Effect.gen(function* () {
			const request = yield* RemixRequest;
			const cookieHeader = request.headers.get("Cookie");

			const session = yield* Effect.tryPromise(async () => {
				return getSession(cookieHeader);
			});

			const name = session.get("name");

			return name;
		});
	};

	return {
		getUser,
		greet: () => {
			return Effect.gen(function* () {
				const name = yield* getUser();

				if (name) {
					yield* Effect.log(`User "${name}" visited!`);

					return `Hello ${name}!`;
				}

				yield* Effect.log("Anonymous user visited!");

				return "Hello stranger!";
			});
		},
		login: (name: string) => {
			return Effect.gen(function* () {
				const request = yield* RemixRequest;
				const cookieHeader = request.headers.get("Cookie");

				const cookie = yield* Effect.tryPromise(async () => {
					const session = await getSession(cookieHeader);

					session.set("name", name);

					return commitSession(session);
				});

				return cookie;
			});
		},
		logout: () => {
			return Effect.gen(function* () {
				const request = yield* RemixRequest;
				const cookieHeader = request.headers.get("Cookie");

				const cookie = yield* Effect.tryPromise(async () => {
					const session = await getSession(cookieHeader);

					return destroySession(session);
				});

				return cookie;
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
