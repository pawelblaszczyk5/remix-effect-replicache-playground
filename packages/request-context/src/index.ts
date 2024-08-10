import { Context, Layer } from "effect";

import type { CreateRequestContext } from "@repo/effect-remix";

export class RemixRequest extends Context.Tag("@repo/request-context#RemixRequest")<RemixRequest, Request>() {}
export class RemixParams extends Context.Tag("@repo/request-context#RemixParams")<
	RemixParams,
	Record<string, string | undefined>
>() {}

export const createRequestContext = (({ params, request }) => {
	const layer = Context.empty().pipe(
		Context.add(RemixRequest, request),
		Context.add(RemixParams, params),
		Layer.succeedContext,
	);

	return layer;
}) satisfies CreateRequestContext;
