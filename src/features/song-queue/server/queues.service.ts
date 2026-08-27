import { Context, Data, Effect, Layer } from "effect";
import type { Queue } from "@/db/schema";
import type { I__CreateMusicQueueInput } from "../queue.schema";
import { Svc__Session } from "@/server/auth/session.service";
import {
	E__QueuesUnavailable,
	Svc__QueuesRepository,
} from "./queues.repository";

export class E__QueueNotFound extends Data.TaggedError("E__QueueNotFound")<{
	readonly message: string;
}> {}

export type E__ListQueues = E__QueuesUnavailable;
export type E__CreateQueue = E__QueuesUnavailable;
export type E__ReadQueue = E__QueueNotFound | E__QueuesUnavailable;
export type E__ChangeQueue = E__QueueNotFound | E__QueuesUnavailable;

interface I__QueuesService {
	readonly listOwned: () => Effect.Effect<
		readonly Queue[],
		E__ListQueues,
		Svc__Session
	>;
	readonly createMusicQueue: (
		input: I__CreateMusicQueueInput,
	) => Effect.Effect<Queue, E__CreateQueue, Svc__Session>;
	readonly getActivePublicByHandle: (
		handle: string,
	) => Effect.Effect<Queue, E__ReadQueue>;
	readonly setActiveQueue: (
		queueId: string,
	) => Effect.Effect<Queue, E__ChangeQueue, Svc__Session>;
	readonly clearActiveQueue: () => Effect.Effect<
		void,
		E__ChangeQueue,
		Svc__Session
	>;
}

export class Svc__Queues extends Context.Tag("Svc__Queues")<
	Svc__Queues,
	I__QueuesService
>() {}

export const Layer_Svc__Queues = Layer.effect(
	Svc__Queues,
	Effect.gen(function* () {
		const repository = yield* Svc__QueuesRepository;

		return {
			listOwned: () =>
				Effect.gen(function* () {
					const { session } = yield* Svc__Session;
					return yield* repository.listOwned(session.user.id);
				}),
			createMusicQueue: (input) =>
				Effect.gen(function* () {
					const { session } = yield* Svc__Session;
					return yield* repository.createMusicQueue({
						ownerUserId: session.user.id,
						name: input.name,
						visibility: input.visibility,
					});
				}),
			getActivePublicByHandle: (handle) =>
				Effect.gen(function* () {
					const queue = yield* repository.findActivePublicByHandle(handle);
					if (!queue) {
						return yield* makePublicQueueNotFound();
					}
					return queue;
				}),
			setActiveQueue: (queueId) =>
				Effect.gen(function* () {
					const { session } = yield* Svc__Session;
					return yield* repository.setActiveQueue({
						ownerUserId: session.user.id,
						queueId,
					});
				}),
			clearActiveQueue: () =>
				Effect.gen(function* () {
					const { session } = yield* Svc__Session;
					return yield* repository.clearActiveQueue(session.user.id);
				}),
		} satisfies I__QueuesService;
	}),
);

function makePublicQueueNotFound() {
	return new E__QueueNotFound({
		message: "This user is not currently running a public queue.",
	});
}
