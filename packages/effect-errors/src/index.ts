import { Data } from "effect";

export class Redirect extends Data.TaggedError("Redirect")<{ init?: number | ResponseInit; url: string }> {}
