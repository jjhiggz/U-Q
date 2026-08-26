import {
	S__AdjustBananaStickersInput,
	S__AdjustSongPointsInput,
	S__SongIdInput,
	S__SubmitSongInput,
	S__UpdateSongInput,
} from "./song-queue.schema";
import {
	MW_Access_GM,
	MW_Access_Session,
	MW_Operation_Public,
} from "@/server/middleware/operation.middleware";
import {
	createServerFn as SF,
	createServerOnlyFn,
} from "@tanstack/react-start";

const operations = createServerOnlyFn(
	() => import("./server/songs.operations"),
);

export const SF_GetSongs = SF({ method: "GET" })
	.middleware([MW_Operation_Public])
	.handler(async ({ context }) =>
		context.run((await operations()).getSongsOperation()),
	);

export const SF_GetArchivedSongs = SF({ method: "GET" })
	.middleware([MW_Operation_Public])
	.handler(async ({ context }) =>
		context.run((await operations()).getArchivedSongsOperation()),
	);

export const SF_SubmitSong = SF({ method: "POST" })
	.middleware([MW_Access_Session])
	.validator(S__SubmitSongInput)
	.handler(async ({ data, context }) =>
		context.runSession((await operations()).submitSongOperation(data)),
	);

export const SF_UpdateSong = SF({ method: "POST" })
	.middleware([MW_Access_Session])
	.validator(S__UpdateSongInput)
	.handler(async ({ data, context }) =>
		context.runSession((await operations()).updateSongOperation(data)),
	);

export const SF_DeleteSong = SF({ method: "POST" })
	.middleware([MW_Access_Session])
	.validator(S__SongIdInput)
	.handler(async ({ data, context }) =>
		context.runSession((await operations()).deleteSongOperation(data.id)),
	);

export const SF_ArchiveSong = SF({ method: "POST" })
	.middleware([MW_Access_GM])
	.validator(S__SongIdInput)
	.handler(async ({ data, context }) =>
		context.runGM((await operations()).archiveSongOperation(data.id)),
	);

export const SF_ClearSongs = SF({ method: "POST" })
	.middleware([MW_Access_GM])
	.handler(async ({ context }) =>
		context.runGM((await operations()).clearSongsOperation()),
	);

export const SF_AdjustSongPoints = SF({ method: "POST" })
	.middleware([MW_Access_GM])
	.validator(S__AdjustSongPointsInput)
	.handler(async ({ data, context }) =>
		context.runGM((await operations()).adjustSongPointsOperation(data)),
	);

export const SF_AdjustBananaStickers = SF({ method: "POST" })
	.middleware([MW_Access_GM])
	.validator(S__AdjustBananaStickersInput)
	.handler(async ({ data, context }) =>
		context.runGM((await operations()).adjustBananaStickersOperation(data)),
	);
