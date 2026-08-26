import { useQuery, useQueryClient } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";
import { serverQueryOptions, useServerMutation } from "@/lib/server-state";
import type { RemoteResult } from "@/server/effect/remote-result";
import {
	SF_AdjustBananaStickers,
	SF_AdjustSongPoints,
	SF_ArchiveSong,
	SF_ClearSongs,
	SF_DeleteSong,
	SF_GetArchivedSongs,
	SF_GetSongs,
	SF_SubmitSong,
	SF_UpdateSong,
} from "./song-queue.functions";
import type {
	I__AdjustBananaStickersInput,
	I__AdjustSongPointsInput,
	I__SongIdInput,
	I__SubmitSongInput,
	I__UpdateSongInput,
} from "./song-queue.schema";
import type {
	E__ChangeSong,
	E__ListSongs,
	E__SubmitSong,
} from "./server/songs.service";
import type { E__SongsUnavailable } from "./server/songs.repository";
import type { Song } from "@/db/schema";
import type {
	E__AuthenticationRequired,
	E__GMAccessRequired,
} from "@/server/middleware/operation.middleware";

export const QK__Songs = ["songs"] as const;
export const QK__ArchivedSongs = ["songs", "archived"] as const;

export interface E__AnonymousSignInFailed {
	readonly _tag: "E__AnonymousSignInFailed";
	readonly message: string;
}

export const QO__Songs = () =>
	serverQueryOptions<readonly Song[], E__ListSongs>({
		queryKey: QK__Songs,
		queryFn: () => SF_GetSongs(),
		refetchInterval: 5_000,
	});

export function useSongs() {
	return useQuery(QO__Songs());
}

export const QO__ArchivedSongs = () =>
	serverQueryOptions<readonly Song[], E__ListSongs>({
		queryKey: QK__ArchivedSongs,
		queryFn: () => SF_GetArchivedSongs(),
		refetchInterval: 5_000,
	});

export function useArchivedSongs() {
	return useQuery(QO__ArchivedSongs());
}

export function useSubmitSong() {
	const queryClient = useQueryClient();

	return useServerMutation<
		I__SubmitSongInput,
		Song,
		E__SubmitSong | E__AuthenticationRequired | E__AnonymousSignInFailed
	>({
		mutationFn: async (
			input,
		): Promise<
			RemoteResult<
				Song,
				E__SubmitSong | E__AuthenticationRequired | E__AnonymousSignInFailed
			>
		> => {
			const currentSession = await authClient.getSession();
			if (!currentSession.data) {
				const anonymousSession = await authClient.signIn.anonymous();
				if (anonymousSession.error) {
					return {
						_tag: "Failure",
						error: {
							_tag: "E__AnonymousSignInFailed",
							message:
								anonymousSession.error.message ??
								"Could not create a guest session.",
						},
					};
				}
			}

			return SF_SubmitSong({ data: input });
		},
		options: {
			onSuccess: () => queryClient.invalidateQueries({ queryKey: QK__Songs }),
		},
	});
}

function useSongMutation<
	Input,
	Output,
	Failure extends
		| E__ChangeSong
		| E__SongsUnavailable
		| E__AuthenticationRequired
		| E__GMAccessRequired,
>(mutationFn: (input: Input) => Promise<RemoteResult<Output, Failure>>) {
	const queryClient = useQueryClient();
	return useServerMutation<Input, Output, Failure>({
		mutationFn,
		options: {
			onSuccess: async () => {
				await Promise.all([
					queryClient.invalidateQueries({ queryKey: QK__Songs }),
					queryClient.invalidateQueries({ queryKey: QK__ArchivedSongs }),
				]);
			},
		},
	});
}

export const useUpdateSong = () =>
	useSongMutation<
		I__UpdateSongInput,
		Song,
		E__ChangeSong | E__AuthenticationRequired
	>((input) => SF_UpdateSong({ data: input }));

export const useDeleteSong = () =>
	useSongMutation<
		I__SongIdInput,
		void,
		E__ChangeSong | E__AuthenticationRequired
	>((input) => SF_DeleteSong({ data: input }));

export const useArchiveSong = () =>
	useSongMutation<
		I__SongIdInput,
		void,
		E__ChangeSong | E__AuthenticationRequired | E__GMAccessRequired
	>((input) => SF_ArchiveSong({ data: input }));

export const useClearSongs = () =>
	useSongMutation<
		void,
		void,
		E__SongsUnavailable | E__AuthenticationRequired | E__GMAccessRequired
	>(() => SF_ClearSongs());

export const useAdjustSongPoints = () =>
	useSongMutation<
		I__AdjustSongPointsInput,
		void,
		E__SongsUnavailable | E__AuthenticationRequired | E__GMAccessRequired
	>((input) => SF_AdjustSongPoints({ data: input }));

export const useAdjustBananaStickers = () =>
	useSongMutation<
		I__AdjustBananaStickersInput,
		void,
		E__SongsUnavailable | E__AuthenticationRequired | E__GMAccessRequired
	>((input) => SF_AdjustBananaStickers({ data: input }));
