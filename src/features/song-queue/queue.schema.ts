import { z } from "zod";

export const S__LiveQueueIdInput = z.object({
	liveQueueId: z.uuid(),
});
export type I__LiveQueueIdInput = z.infer<typeof S__LiveQueueIdInput>;

export const S__CreateMusicLiveQueueInput = z.object({
	name: z.string().trim().min(1).max(120),
	visibility: z.enum(["private", "unlisted"]).default("private"),
});
export type I__CreateMusicLiveQueueInput = z.infer<
	typeof S__CreateMusicLiveQueueInput
>;

export const S__LiveQueueHandleInput = z.object({
	handle: z.string().trim().min(1).max(64),
});
export type I__LiveQueueHandleInput = z.infer<typeof S__LiveQueueHandleInput>;
