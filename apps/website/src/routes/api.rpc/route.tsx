import type { ActionFunction } from "@remix-run/node";

import { handleRpcWebRequest } from "@todofall/rpc-server/handler";

export const action = (async ({ request }) => handleRpcWebRequest(request)) satisfies ActionFunction;
