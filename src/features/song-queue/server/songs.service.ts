import { Context, Data, Effect, Layer } from "effect";
import { match } from "ts-pattern";
import type { Song } from "@/db/schema";
import type {
	I__AdjustBananaStickersInput,
	I__AdjustSongPointsInput,
	I__SubmitSongInput,
	I__UpdateSongInput,
} from "../song-queue.schema";
import { Svc__GMAccess, Svc__Session } from "@/server/auth/session.service";
import { F_Policy__IsGM } from "@/server/auth/gm-access.policy";
import { Svc__Database } from "@/server/database/database.service";
import { E__SongsUnavailable, Svc__SongsRepository } from "./songs.repository";

export class E__SongAlreadyQueued extends Data.TaggedError(
	"E__SongAlreadyQueued",
)<{
	readonly message: string;
	readonly songId: number;
}> {}

export class E__SongNotFound extends Data.TaggedError("E__SongNotFound")<{
	readonly message: string;
}> {}

export class E__SongAccessDenied extends Data.TaggedError(
	"E__SongAccessDenied",
)<{
	readonly message: string;
}> {}

export type E__ListSongs = E__SongsUnavailable;
export type E__SubmitSong = E__SongAlreadyQueued | E__SongsUnavailable;
export type E__ChangeSong =
	| E__SongNotFound
	| E__SongAccessDenied
	| E__SongsUnavailable;

interface I__SongsService {
	readonly listActive: () => Effect.Effect<readonly Song[], E__ListSongs>;
	readonly listArchived: () => Effect.Effect<readonly Song[], E__ListSongs>;
	readonly submit: (
		input: I__SubmitSongInput,
	) => Effect.Effect<Song, E__SubmitSong, Svc__Session>;
	readonly update: (
		input: I__UpdateSongInput,
	) => Effect.Effect<Song, E__ChangeSong, Svc__Session>;
	readonly delete: (
		id: number,
	) => Effect.Effect<void, E__ChangeSong, Svc__Session>;
	readonly archive: (
		id: number,
	) => Effect.Effect<void, E__ChangeSong, Svc__GMAccess>;
	readonly clear: () => Effect.Effect<void, E__SongsUnavailable, Svc__GMAccess>;
	readonly adjustPoints: (
		input: I__AdjustSongPointsInput,
	) => Effect.Effect<void, E__SongsUnavailable, Svc__GMAccess>;
	readonly adjustBananaStickers: (
		input: I__AdjustBananaStickersInput,
	) => Effect.Effect<void, E__SongsUnavailable, Svc__GMAccess>;
}

export class Svc__Songs extends Context.Tag("Svc__Songs")<
	Svc__Songs,
	I__SongsService
>() {}

export const Layer_Svc__Songs = Layer.effect(
	Svc__Songs,
	Effect.gen(function* () {
		const database = yield* Svc__Database;
		const repository = yield* Svc__SongsRepository;

		return {
			listActive: repository.listActive,
			listArchived: repository.listArchived,
			submit: (input) =>
				Effect.gen(function* () {
					const { session } = yield* Svc__Session;
					const isGM = F_Policy__IsGM({ email: session.user.email });

					return yield* database
						.transaction(
							Effect.gen(function* () {
								if (!isGM) {
									const existing = yield* repository.findActiveBySubmitter(
										session.user.id,
									);
									if (existing) {
										return yield* new E__SongAlreadyQueued({
											message:
												"You already have a song in the queue. Wait until it gets picked!",
											songId: existing.id,
										});
									}
								}

								return yield* repository.insert({
									...input,
									submittedByUserId: session.user.id,
								});
							}),
						)
						.pipe(
							Effect.mapError(
								(error): E__SubmitSong =>
									match(error)
										.with(
											{ _tag: "E__SongAlreadyQueued" },
											(failure) => failure,
										)
										.with({ _tag: "E__SongsUnavailable" }, (failure) => failure)
										.otherwise(
											() =>
												new E__SongsUnavailable({
													message: "The song queue is temporarily unavailable.",
												}),
										),
							),
						);
				}),
			update: (input) =>
				Effect.gen(function* () {
					const { session } = yield* Svc__Session;
					const existing = yield* repository.findById(input.id);
					if (!existing) {
						return yield* new E__SongNotFound({ message: "Song not found." });
					}
					const isGM = F_Policy__IsGM({ email: session.user.email });
					if (!isGM && existing.submittedByUserId !== session.user.id) {
						return yield* new E__SongAccessDenied({
							message: "You can only edit your own songs.",
						});
					}
					const updated = yield* repository.update(input);
					return yield* updated
						? Effect.succeed(updated)
						: new E__SongNotFound({ message: "Song not found." });
				}),
			delete: (id) =>
				Effect.gen(function* () {
					const { session } = yield* Svc__Session;
					const existing = yield* repository.findById(id);
					if (!existing) {
						return yield* new E__SongNotFound({ message: "Song not found." });
					}
					const isGM = F_Policy__IsGM({ email: session.user.email });
					if (!isGM && existing.submittedByUserId !== session.user.id) {
						return yield* new E__SongAccessDenied({
							message: "You can only delete your own songs.",
						});
					}
					return yield* repository.delete(id);
				}),
			archive: (id) =>
				Effect.gen(function* () {
					yield* Svc__GMAccess;
					const existing = yield* repository.findById(id);
					if (!existing) {
						return yield* new E__SongNotFound({ message: "Song not found." });
					}
					return yield* database
						.transaction(
							Effect.all(
								[repository.archive(id), repository.incrementActivePoints()],
								{
									concurrency: 1,
									discard: true,
								},
							),
						)
						.pipe(
							Effect.mapError(
								() =>
									new E__SongsUnavailable({
										message: "The song queue is temporarily unavailable.",
									}),
							),
						);
				}),
			clear: () => Effect.andThen(Svc__GMAccess, repository.clear()),
			adjustPoints: ({ id, points }) =>
				Effect.andThen(Svc__GMAccess, repository.adjustPoints({ id, points })),
			adjustBananaStickers: ({ id, delta }) =>
				Effect.andThen(
					Svc__GMAccess,
					repository.adjustBananaStickers({ id, delta }),
				),
		} satisfies I__SongsService;
	}),
);
