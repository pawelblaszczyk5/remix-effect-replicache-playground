import { Schema } from "@effect/schema";

export class Test extends Schema.TaggedRequest<Test>()("Test", Schema.Never, Schema.String, {}) {}
