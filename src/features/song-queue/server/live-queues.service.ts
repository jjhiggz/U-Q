import { Context, Data, Effect, Layer } from "effect";
import type { LiveQueue } from "@/db/schema";
import type { I__CreateMusicLiveQueueInput } from "../queue.schema";
import { Svc__Session } from "@/server/auth/session.service";
import {
	E__LiveQueuesUnavailable,
	Svc__LiveQueuesRepository,
} from "./live-queues.repository";

export class E__LiveQueueNotFound extends Data.TaggedError(
	"E__LiveQueueNotFound",
)<{
	readonly message: string;
}> {}

export type E__ListLiveQueues = E__LiveQueuesUnavailable;
export type E__CreateLiveQueue = E__LiveQueuesUnavailable;
export type E__ReadLiveQueue = E__LiveQueueNotFound | E__LiveQueuesUnavailable;
export type E__ChangeLiveQueue =
	| E__LiveQueueNotFound
	| E__LiveQueuesUnavailable;

interface I__LiveQueuesService {
	readonly listOwned: () => Effect.Effect<
		readonly LiveQueue[],
		E__ListLiveQueues,
		Svc__Session
	>;
	readonly createMusicLiveQueue: (
		input: I__CreateMusicLiveQueueInput,
	) => Effect.Effect<LiveQueue, E__CreateLiveQueue, Svc__Session>;
	readonly getActivePublicByHandle: (
		handle: string,
	) => Effect.Effect<LiveQueue, E__ReadLiveQueue>;
	readonly setActiveLiveQueue: (
		liveQueueId: string,
	) => Effect.Effect<LiveQueue, E__ChangeLiveQueue, Svc__Session>;
	readonly clearActiveLiveQueue: () => Effect.Effect<
		void,
		E__ChangeLiveQueue,
		Svc__Session
	>;
}

export class Svc__LiveQueues extends Context.Tag("Svc__LiveQueues")<
	Svc__LiveQueues,
	I__LiveQueuesService
>() {}

export const Layer_Svc__LiveQueues = Layer.effect(
	Svc__LiveQueues,
	Effect.gen(function* () {
		const repository = yield* Svc__LiveQueuesRepository;

		return {
			listOwned: () =>
				Effect.gen(function* () {
					const { session } = yield* Svc__Session;
					return yield* repository.listOwned(session.user.id);
				}),
			createMusicLiveQueue: (input) =>
				Effect.gen(function* () {
					const { session } = yield* Svc__Session;
					return yield* repository.createMusicLiveQueue({
						ownerUserId: session.user.id,
						name: input.name,
						visibility: input.visibility,
					});
				}),
			getActivePublicByHandle: (handle) =>
				Effect.gen(function* () {
					const queue = yield* repository.findActivePublicByHandle(handle);
					if (!queue) {
						return yield* makePublicLiveQueueNotFound();
					}
					return queue;
				}),
			setActiveLiveQueue: (liveQueueId) =>
				Effect.gen(function* () {
					const { session } = yield* Svc__Session;
					return yield* repository.setActiveLiveQueue({
						ownerUserId: session.user.id,
						liveQueueId,
					});
				}),
			clearActiveLiveQueue: () =>
				Effect.gen(function* () {
					const { session } = yield* Svc__Session;
					return yield* repository.clearActiveLiveQueue(session.user.id);
				}),
		} satisfies I__LiveQueuesService;
	}),
);

function makePublicLiveQueueNotFound() {
	return new E__LiveQueueNotFound({
		message: "This user is not currently running a public queue.",
	});
}
