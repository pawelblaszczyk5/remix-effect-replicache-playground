import { Form } from "@remix-run/react";
import { Effect } from "effect";

import { Redirect } from "@repo/effect-errors";
import { defineEffectAction, defineEffectLoader } from "@repo/effect-runtime";
import { UserService } from "@repo/user-service";

export const loader = defineEffectLoader(
	Effect.gen(function* () {
		const userService = yield* UserService;
		const user = yield* userService.getUser();

		if (!user) {
			return yield* new Redirect({ url: "/" });
		}

		return null;
	}),
);

export const action = defineEffectAction(
	Effect.gen(function* () {
		const userService = yield* UserService;

		const cookie = yield* userService.logout();

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
			<title>Logout</title>
			<Form method="POST">
				<button type="submit">Logout</button>
			</Form>
		</>
	);
};

export default Route;
