import { useQuery, useQueryClient } from "@tanstack/react-query";
import { serverQueryOptions, useServerMutation } from "@/lib/server-state";
import type { Queue } from "@/db/schema";
import type { RemoteResult } from "@/server/effect/remote-result";
import type { I__CreateMusicQueueInput, I__QueueIdInput } from "./queue.schema";
import {
	SF_ClearActiveQueue,
	SF_CreateMusicQueue,
	SF_GetActivePublicQueue,
	SF_ListOwnedQueues,
	SF_SetActiveQueue,
} from "./queue.functions";
import type {
	E__ChangeQueue,
	E__CreateQueue,
	E__ListQueues,
	E__ReadQueue,
} from "./server/queues.service";
import type { E__AuthenticationRequired } from "@/server/middleware/operation.middleware";

export const QK__OwnedQueues = ["queues", "owned"] as const;
export const QK__ActivePublicQueue = (handle: string) =>
	["queues", "public", handle] as const;

export const QO__OwnedQueues = () =>
	serverQueryOptions<
		readonly Queue[],
		E__ListQueues | E__AuthenticationRequired
	>({
		queryKey: QK__OwnedQueues,
		queryFn: () => SF_ListOwnedQueues(),
	});

export function useOwnedQueues() {
	return useQuery(QO__OwnedQueues());
}

export const QO__ActivePublicQueue = (handle: string) =>
	serverQueryOptions<Queue, E__ReadQueue>({
		queryKey: QK__ActivePublicQueue(handle),
		queryFn: () => SF_GetActivePublicQueue({ data: { handle } }),
		refetchInterval: 5_000,
	});

export function useActivePublicQueue(handle: string) {
	return useQuery(QO__ActivePublicQueue(handle));
}

export function useCreateMusicQueue() {
	const queryClient = useQueryClient();
	return useServerMutation<
		I__CreateMusicQueueInput,
		Queue,
		E__CreateQueue | E__AuthenticationRequired
	>({
		mutationFn: (
			input,
		): Promise<
			RemoteResult<Queue, E__CreateQueue | E__AuthenticationRequired>
		> => SF_CreateMusicQueue({ data: input }),
		options: {
			onSuccess: () =>
				queryClient.invalidateQueries({ queryKey: QK__OwnedQueues }),
		},
	});
}

export function useSetActiveQueue() {
	const queryClient = useQueryClient();
	return useServerMutation<
		I__QueueIdInput,
		Queue,
		E__ChangeQueue | E__AuthenticationRequired
	>({
		mutationFn: (
			input,
		): Promise<
			RemoteResult<Queue, E__ChangeQueue | E__AuthenticationRequired>
		> => SF_SetActiveQueue({ data: input }),
		options: {
			onSuccess: () =>
				queryClient.invalidateQueries({ queryKey: QK__OwnedQueues }),
		},
	});
}

export function useClearActiveQueue() {
	const queryClient = useQueryClient();
	return useServerMutation<
		void,
		void,
		E__ChangeQueue | E__AuthenticationRequired
	>({
		mutationFn: () => SF_ClearActiveQueue(),
		options: {
			onSuccess: () =>
				queryClient.invalidateQueries({ queryKey: QK__OwnedQueues }),
		},
	});
}
