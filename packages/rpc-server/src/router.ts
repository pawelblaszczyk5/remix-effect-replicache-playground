import { Router } from "@effect/rpc";

import { procedures } from "@todofall/rpc-example/procedures";

export const router = Router.make(...procedures);

export type Router = typeof router;
