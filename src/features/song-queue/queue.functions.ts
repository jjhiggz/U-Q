import {
	S__CreateMusicLiveQueueInput,
	S__LiveQueueHandleInput,
	S__LiveQueueIdInput,
} from "./queue.schema";
import {
	MW_Access_Session,
	MW_Operation_Public,
} from "@/server/middleware/operation.middleware";
import {
	createServerFn as SF,
	createServerOnlyFn,
} from "@tanstack/react-start";

const operations = createServerOnlyFn(
	() => import("./server/live-queues.operations"),
);

export const SF_ListOwnedLiveQueues = SF({ method: "GET" })
	.middleware([MW_Access_Session])
	.handler(async ({ context }) =>
		context.runSession((await operations()).listOwnedLiveQueuesOperation()),
	);

export const SF_CreateMusicLiveQueue = SF({ method: "POST" })
	.middleware([MW_Access_Session])
	.validator(S__CreateMusicLiveQueueInput)
	.handler(async ({ data, context }) =>
		context.runSession(
			(await operations()).createMusicLiveQueueOperation(data),
		),
	);

export const SF_GetActivePublicLiveQueue = SF({ method: "GET" })
	.middleware([MW_Operation_Public])
	.validator(S__LiveQueueHandleInput)
	.handler(async ({ data, context }) =>
		context.run(
			(await operations()).getActivePublicLiveQueueOperation(data.handle),
		),
	);

export const SF_SetActiveLiveQueue = SF({ method: "POST" })
	.middleware([MW_Access_Session])
	.validator(S__LiveQueueIdInput)
	.handler(async ({ data, context }) =>
		context.runSession(
			(await operations()).setActiveLiveQueueOperation(data.liveQueueId),
		),
	);

export const SF_ClearActiveLiveQueue = SF({ method: "POST" })
	.middleware([MW_Access_Session])
	.handler(async ({ context }) =>
		context.runSession((await operations()).clearActiveLiveQueueOperation()),
	);
