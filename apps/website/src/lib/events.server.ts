type InitFunction = (send: SendFunction) => void;
type SendFunction = (event: string, data: string) => void;

const UPDATE_EVENT_NAME = "update";

const eventEmitter = new EventTarget();

export const sendGlobalUpdate = () => {
	eventEmitter.dispatchEvent(new CustomEvent(UPDATE_EVENT_NAME));
};

export const listenToUpdates = (signal: AbortSignal, callback: () => void) => {
	eventEmitter.addEventListener(
		UPDATE_EVENT_NAME,
		(event) => {
			if (!(event instanceof CustomEvent)) {
				return;
			}

			callback();
		},
		{ signal },
	);
};

export const eventStream = (request: Request, init: InitFunction) => {
	const stream = new ReadableStream({
		start: (controller) => {
			const encoder = new TextEncoder();
			const send = (event: string, data: string) => {
				controller.enqueue(encoder.encode(`event: ${event}\n`));
				controller.enqueue(encoder.encode(`data: ${data}\n\n`));
			};

			init(send);

			let closed = false;
			const close = () => {
				if (closed) {
					return;
				}

				closed = true;
				request.signal.removeEventListener("abort", close);
				controller.close();
			};

			request.signal.addEventListener("abort", close);
			if (request.signal.aborted) {
				close();
				return;
			}
		},
	});

	return new Response(stream, {
		headers: { "Content-Type": "text/event-stream" },
	});
};
