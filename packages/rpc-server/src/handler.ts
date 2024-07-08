import { HttpApp } from "@effect/platform";
import { HttpRouterNoStream } from "@effect/rpc-http";

import { router } from "#src/router.js";

export const handleRpcWebRequest = HttpApp.toWebHandler(HttpRouterNoStream.toHttpApp(router));
