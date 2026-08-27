import {
	S__CreateMusicQueueInput,
	S__QueueHandleInput,
	S__QueueIdInput,
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
	() => import("./server/queues.operations"),
);

export const SF_ListOwnedQueues = SF({ method: "GET" })
	.middleware([MW_Access_Session])
	.handler(async ({ context }) =>
		context.runSession((await operations()).listOwnedQueuesOperation()),
	);

export const SF_CreateMusicQueue = SF({ method: "POST" })
	.middleware([MW_Access_Session])
	.validator(S__CreateMusicQueueInput)
	.handler(async ({ data, context }) =>
		context.runSession((await operations()).createMusicQueueOperation(data)),
	);

export const SF_GetActivePublicQueue = SF({ method: "GET" })
	.middleware([MW_Operation_Public])
	.validator(S__QueueHandleInput)
	.handler(async ({ data, context }) =>
		context.run(
			(await operations()).getActivePublicQueueOperation(data.handle),
		),
	);

export const SF_SetActiveQueue = SF({ method: "POST" })
	.middleware([MW_Access_Session])
	.validator(S__QueueIdInput)
	.handler(async ({ data, context }) =>
		context.runSession(
			(await operations()).setActiveQueueOperation(data.queueId),
		),
	);

export const SF_ClearActiveQueue = SF({ method: "POST" })
	.middleware([MW_Access_Session])
	.handler(async ({ context }) =>
		context.runSession((await operations()).clearActiveQueueOperation()),
	);
