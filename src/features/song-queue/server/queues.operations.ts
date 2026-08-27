import { Effect } from "effect";
import type { I__CreateMusicQueueInput } from "../queue.schema";
import { annotateOperation } from "@/server/effect/runtime";
import { Svc__Queues } from "./queues.service";

export const listOwnedQueuesOperation = () =>
	Effect.gen(function* () {
		const service = yield* Svc__Queues;
		return yield* service.listOwned();
	}).pipe((effect) => annotateOperation({ name: "queues.listOwned", effect }));

export const createMusicQueueOperation = (input: I__CreateMusicQueueInput) =>
	Effect.gen(function* () {
		const service = yield* Svc__Queues;
		return yield* service.createMusicQueue(input);
	}).pipe((effect) =>
		annotateOperation({ name: "queues.createMusicQueue", effect }),
	);

export const getActivePublicQueueOperation = (handle: string) =>
	Effect.gen(function* () {
		const service = yield* Svc__Queues;
		return yield* service.getActivePublicByHandle(handle);
	}).pipe((effect) =>
		annotateOperation({ name: "queues.getActivePublic", effect }),
	);

export const setActiveQueueOperation = (queueId: string) =>
	Effect.gen(function* () {
		const service = yield* Svc__Queues;
		return yield* service.setActiveQueue(queueId);
	}).pipe((effect) => annotateOperation({ name: "queues.setActive", effect }));

export const clearActiveQueueOperation = () =>
	Effect.gen(function* () {
		const service = yield* Svc__Queues;
		return yield* service.clearActiveQueue();
	}).pipe((effect) =>
		annotateOperation({ name: "queues.clearActive", effect }),
	);
