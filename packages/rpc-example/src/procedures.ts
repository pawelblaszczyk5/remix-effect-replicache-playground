import { Rpc } from "@effect/rpc";
import { Effect } from "effect";

import { Test } from "#src/schema.js";

export const procedures = [
	Rpc.effect(Test, () =>
		Effect.gen(function* () {
			yield* Effect.log("Test log from procedure");

			return "bla";
		}),
	),
] as const;
