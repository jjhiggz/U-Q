import * as Sentry from "@sentry/tanstackstart-react";
import { Cause, Effect, Either, Layer, ManagedRuntime } from "effect";
import type { I__RemoteFailure, RemoteResult } from "./remote-result";
import { Layer__Database } from "@/server/database/database.service";
import { Layer_Repo__Songs } from "@/features/song-queue/server/songs.repository";
import {
	Layer_Svc__Songs,
	Svc__Songs,
} from "@/features/song-queue/server/songs.service";

const Layer__Application = Layer_Svc__Songs.pipe(
	Layer.provide(Layer_Repo__Songs),
	Layer.provide(Layer__Database),
);
const runtime = ManagedRuntime.make(Layer__Application);

type AppServices = Svc__Songs;

export async function runOperation<A, E extends I__RemoteFailure>(
	operation: Effect.Effect<A, E, AppServices>,
): Promise<RemoteResult<A, E>> {
	try {
		const result = await runtime.runPromise(Effect.either(operation));
		return Either.match(result, {
			onLeft: (error) => ({
				_tag: "Failure" as const,
				error: toRemoteFailure(error),
			}),
			onRight: (value) => ({ _tag: "Success" as const, value }),
		});
	} catch (defect) {
		Sentry.captureException(defect);
		console.error("Unexpected Effect operation defect", defect);
		throw new Error("The operation failed unexpectedly.", { cause: defect });
	}
}

export function runOperationWith<RProvided>(
	layer: Layer.Layer<RProvided, never, never>,
) {
	return <A, E extends I__RemoteFailure>(
		operation: Effect.Effect<A, E, AppServices | RProvided>,
	): Promise<RemoteResult<A, E>> =>
		runOperation(operation.pipe(Effect.provide(layer)));
}

function toRemoteFailure<E extends I__RemoteFailure>(error: E) {
	const { _tag, message } = error;
	const details = Object.fromEntries(
		Object.entries(error).filter(
			([key]) => !["_tag", "cause", "message", "name", "stack"].includes(key),
		),
	);

	return {
		_tag,
		message,
		...details,
	} as import("./remote-result").RemoteFailure<E>;
}

export function annotateOperation<A, E, R>(args: {
	readonly name: string;
	readonly effect: Effect.Effect<A, E, R>;
}): Effect.Effect<A, E, R> {
	return args.effect.pipe(
		Effect.withSpan(args.name, {
			attributes: { "app.operation": args.name },
		}),
		Effect.tapErrorCause((cause) =>
			Effect.sync(() => {
				if (!Cause.isFailure(cause)) {
					Sentry.captureException(Cause.squash(cause));
				}
			}),
		),
	);
}
