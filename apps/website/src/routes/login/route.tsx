import { Form } from "@remix-run/react";
import { Effect } from "effect";

import { Redirect } from "@repo/effect-errors";
import { defineEffectAction, defineEffectLoader } from "@repo/effect-runtime";
import { RemixRequest } from "@repo/request-context";
import { UserService } from "@repo/user-service";

export const loader = defineEffectLoader(
	Effect.gen(function* () {
		const userService = yield* UserService;
		const user = yield* userService.getUser();

		if (user) {
			return yield* new Redirect({ url: "/" });
		}

		return null;
	}),
);

export const action = defineEffectAction(
	Effect.gen(function* () {
		const remixRequest = yield* RemixRequest;
		const userService = yield* UserService;

		const formData = yield* Effect.tryPromise(async () => {
			return remixRequest.formData();
		});

		const name = formData.get("name");

		const cookie = yield* userService.login(name as string);

		return yield* new Redirect({
			init: {
				headers: {
					"Set-Cookie": cookie,
				},
			},
			url: "/",
		});
	}),
);

const Route = () => {
	return (
		<>
			<title>Login</title>
			<Form method="POST">
				<label htmlFor="name">Name</label>
				<input id="name" name="name" required={true} type="text" />
				<button type="submit">Login</button>
			</Form>
		</>
	);
};

export default Route;
