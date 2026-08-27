import { Effect } from "effect";
import type { I__CreateMusicLiveQueueInput } from "../queue.schema";
import { annotateOperation } from "@/server/effect/runtime";
import { Svc__LiveQueues } from "./live-queues.service";

export const listOwnedLiveQueuesOperation = () =>
	Effect.gen(function* () {
		const service = yield* Svc__LiveQueues;
		return yield* service.listOwned();
	}).pipe((effect) =>
		annotateOperation({ name: "liveQueues.listOwned", effect }),
	);

export const createMusicLiveQueueOperation = (
	input: I__CreateMusicLiveQueueInput,
) =>
	Effect.gen(function* () {
		const service = yield* Svc__LiveQueues;
		return yield* service.createMusicLiveQueue(input);
	}).pipe((effect) =>
		annotateOperation({ name: "liveQueues.createMusicLiveQueue", effect }),
	);

export const getActivePublicLiveQueueOperation = (handle: string) =>
	Effect.gen(function* () {
		const service = yield* Svc__LiveQueues;
		return yield* service.getActivePublicByHandle(handle);
	}).pipe((effect) =>
		annotateOperation({ name: "liveQueues.getActivePublic", effect }),
	);

export const setActiveLiveQueueOperation = (liveQueueId: string) =>
	Effect.gen(function* () {
		const service = yield* Svc__LiveQueues;
		return yield* service.setActiveLiveQueue(liveQueueId);
	}).pipe((effect) =>
		annotateOperation({ name: "liveQueues.setActive", effect }),
	);

export const clearActiveLiveQueueOperation = () =>
	Effect.gen(function* () {
		const service = yield* Svc__LiveQueues;
		return yield* service.clearActiveLiveQueue();
	}).pipe((effect) =>
		annotateOperation({ name: "liveQueues.clearActive", effect }),
	);
