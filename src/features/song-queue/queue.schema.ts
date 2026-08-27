import { z } from "zod";

export const S__QueueIdInput = z.object({
	queueId: z.uuid(),
});
export type I__QueueIdInput = z.infer<typeof S__QueueIdInput>;

export const S__CreateMusicQueueInput = z.object({
	name: z.string().trim().min(1).max(120),
	visibility: z.enum(["private", "unlisted"]).default("private"),
});
export type I__CreateMusicQueueInput = z.infer<typeof S__CreateMusicQueueInput>;

export const S__QueueHandleInput = z.object({
	handle: z.string().trim().min(1).max(64),
});
export type I__QueueHandleInput = z.infer<typeof S__QueueHandleInput>;
