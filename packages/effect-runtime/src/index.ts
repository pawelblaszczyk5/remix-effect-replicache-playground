import { Layer, Logger } from "effect";

import { DatabaseLive } from "@repo/database";
import { createEffectRemixRuntime } from "@repo/effect-remix";
import { createRequestContext } from "@repo/request-context";
import { UserService } from "@repo/user-service";

const AppLayer = Layer.mergeAll(Logger.pretty, UserService.live, DatabaseLive);

const runtime = createEffectRemixRuntime(AppLayer, createRequestContext);

export const { data, defineEffectAction, defineEffectLoader } = runtime;

export { type DataWithResponseInit } from "@repo/effect-remix";
