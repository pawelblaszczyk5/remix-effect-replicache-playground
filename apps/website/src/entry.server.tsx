import type { EntryContext } from "@remix-run/node";
import type { RenderToPipeableStreamOptions } from "react-dom/server";

import { createReadableStreamFromReadable } from "@remix-run/node";
import { RemixServer } from "@remix-run/react";
import { isbot } from "isbot";
import { PassThrough } from "node:stream";
import { renderToPipeableStream } from "react-dom/server";

const ABORT_DELAY = 5_000;

const handleRequest = async (
	request: Request,
	responseStatusCode: number,
	responseHeaders: Headers,
	routerContext: EntryContext,
) => {
	return new Promise((resolve, reject) => {
		let shellRendered = false;
		let finalResponseStatusCode = responseStatusCode;
		const userAgent = request.headers.get("user-agent");

		const shouldServerStreamResponse = Boolean(userAgent && isbot(userAgent)) || routerContext.isSpaMode;

		const readyOption = (
			shouldServerStreamResponse ? "onAllReady" : "onShellReady"
		) satisfies keyof RenderToPipeableStreamOptions;

		const { abort, pipe } = renderToPipeableStream(
			<RemixServer abortDelay={ABORT_DELAY} context={routerContext} url={request.url} />,
			{
				onError: (error: unknown) => {
					finalResponseStatusCode = 500;

					// eslint-disable-next-line no-console -- I'm not sure when this happen
					if (shellRendered) console.error(error);
				},
				onShellError: (error: unknown) => {
					// eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors -- this should be error ideally
					reject(error);
				},
				[readyOption]: () => {
					shellRendered = true;
					const body = new PassThrough();
					const stream = createReadableStreamFromReadable(body);

					responseHeaders.set("Content-Type", "text/html");

					resolve(
						new Response(stream, {
							headers: responseHeaders,
							status: finalResponseStatusCode,
						}),
					);

					pipe(body);
				},
			},
		);

		setTimeout(abort, ABORT_DELAY);
	});
};

export default handleRequest;
