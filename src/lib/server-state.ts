import {
	queryOptions,
	useMutation,
	type QueryKey,
	type UseMutationOptions,
} from "@tanstack/react-query";
import type {
	I__RemoteFailure,
	RemoteError,
	RemoteResult,
} from "@/server/effect/remote-result";
import { unwrapRemoteResult } from "@/server/effect/remote-result";

export function serverQueryOptions<A, E extends I__RemoteFailure>(args: {
	readonly queryKey: QueryKey;
	readonly queryFn: () => Promise<RemoteResult<A, E>>;
	readonly refetchInterval?: number;
	readonly retry?: boolean;
}) {
	return queryOptions({
		queryKey: args.queryKey,
		queryFn: async () => unwrapRemoteResult(await args.queryFn()),
		refetchInterval: args.refetchInterval,
		retry: args.retry,
	});
}

export function useServerMutation<
	Input,
	Output,
	Failure extends I__RemoteFailure,
>(args: {
	readonly mutationFn: (input: Input) => Promise<RemoteResult<Output, Failure>>;
	readonly options?: Omit<
		UseMutationOptions<Output, RemoteError<Failure>, Input>,
		"mutationFn"
	>;
}) {
	return useMutation<Output, RemoteError<Failure>, Input>({
		...args.options,
		mutationFn: async (input) =>
			unwrapRemoteResult(await args.mutationFn(input)),
	});
}
