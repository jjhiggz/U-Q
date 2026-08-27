import { useQuery, useQueryClient } from "@tanstack/react-query";
import { serverQueryOptions, useServerMutation } from "@/lib/server-state";
import type { LiveQueue } from "@/db/schema";
import type { RemoteResult } from "@/server/effect/remote-result";
import type {
	I__CreateMusicLiveQueueInput,
	I__LiveQueueIdInput,
} from "./queue.schema";
import {
	SF_ClearActiveLiveQueue,
	SF_CreateMusicLiveQueue,
	SF_GetActivePublicLiveQueue,
	SF_ListOwnedLiveQueues,
	SF_SetActiveLiveQueue,
} from "./queue.functions";
import type {
	E__ChangeLiveQueue,
	E__CreateLiveQueue,
	E__ListLiveQueues,
	E__ReadLiveQueue,
} from "./server/live-queues.service";
import type { E__AuthenticationRequired } from "@/server/middleware/operation.middleware";

export const QK__OwnedLiveQueues = ["liveQueues", "owned"] as const;
export const QK__ActivePublicLiveQueue = (handle: string) =>
	["liveQueues", "public", handle] as const;

export const QO__OwnedLiveQueues = () =>
	serverQueryOptions<
		readonly LiveQueue[],
		E__ListLiveQueues | E__AuthenticationRequired
	>({
		queryKey: QK__OwnedLiveQueues,
		queryFn: () => SF_ListOwnedLiveQueues(),
	});

export function useOwnedLiveQueues() {
	return useQuery(QO__OwnedLiveQueues());
}

export const QO__ActivePublicLiveQueue = (handle: string) =>
	serverQueryOptions<LiveQueue, E__ReadLiveQueue>({
		queryKey: QK__ActivePublicLiveQueue(handle),
		queryFn: () => SF_GetActivePublicLiveQueue({ data: { handle } }),
		refetchInterval: 5_000,
		retry: false,
	});

export function useActivePublicLiveQueue(handle: string) {
	return useQuery(QO__ActivePublicLiveQueue(handle));
}

export function useCreateMusicLiveQueue() {
	const queryClient = useQueryClient();
	return useServerMutation<
		I__CreateMusicLiveQueueInput,
		LiveQueue,
		E__CreateLiveQueue | E__AuthenticationRequired
	>({
		mutationFn: (
			input,
		): Promise<
			RemoteResult<LiveQueue, E__CreateLiveQueue | E__AuthenticationRequired>
		> => SF_CreateMusicLiveQueue({ data: input }),
		options: {
			onSuccess: () =>
				queryClient.invalidateQueries({ queryKey: QK__OwnedLiveQueues }),
		},
	});
}

export function useSetActiveLiveQueue() {
	const queryClient = useQueryClient();
	return useServerMutation<
		I__LiveQueueIdInput,
		LiveQueue,
		E__ChangeLiveQueue | E__AuthenticationRequired
	>({
		mutationFn: (
			input,
		): Promise<
			RemoteResult<LiveQueue, E__ChangeLiveQueue | E__AuthenticationRequired>
		> => SF_SetActiveLiveQueue({ data: input }),
		options: {
			onSuccess: () =>
				queryClient.invalidateQueries({ queryKey: QK__OwnedLiveQueues }),
		},
	});
}

export function useClearActiveLiveQueue() {
	const queryClient = useQueryClient();
	return useServerMutation<
		void,
		void,
		E__ChangeLiveQueue | E__AuthenticationRequired
	>({
		mutationFn: () => SF_ClearActiveLiveQueue(),
		options: {
			onSuccess: () =>
				queryClient.invalidateQueries({ queryKey: QK__OwnedLiveQueues }),
		},
	});
}
