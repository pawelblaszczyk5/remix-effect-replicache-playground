import { HttpClient, HttpClientRequest } from "@effect/platform";
import { Resolver } from "@effect/rpc";
import { HttpResolverNoStream } from "@effect/rpc-http";

import type { Router } from "@todofall/rpc-server/router";

export const client = HttpResolverNoStream.make<Router>(
	HttpClient.fetchOk.pipe(HttpClient.mapRequest(HttpClientRequest.prependUrl("/api/rpc"))),
).pipe(Resolver.toClient);
