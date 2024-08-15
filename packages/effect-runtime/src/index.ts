import { Layer, Logger } from "effect";

import { Database } from "@repo/database";
import { createEffectRemixRuntime } from "@repo/effect-remix";
import { createRequestContext } from "@repo/request-context";
import { UserService } from "@repo/user-service";

const AppLayer = Layer.mergeAll(Logger.pretty, UserService.live, Database.live);

const runtime = createEffectRemixRuntime(AppLayer, createRequestContext);

export const { data, defineEffectAction, defineEffectLoader } = runtime;

export { type DataWithResponseInit } from "@repo/effect-remix";
