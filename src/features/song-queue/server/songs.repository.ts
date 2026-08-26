import { Context, Data, Effect, Layer } from "effect";
import { and, desc, eq, isNotNull, isNull, sql } from "drizzle-orm";
import { songs, type Song } from "@/db/schema";
import type {
	I__SubmitSongInput,
	I__UpdateSongInput,
} from "../song-queue.schema";
import { Svc__Database } from "@/server/database/database.service";

export class E__SongsUnavailable extends Data.TaggedError(
	"E__SongsUnavailable",
)<{
	readonly message: string;
}> {}

interface I__SongsRepository {
	readonly listActive: () => Effect.Effect<
		readonly Song[],
		E__SongsUnavailable
	>;
	readonly listArchived: () => Effect.Effect<
		readonly Song[],
		E__SongsUnavailable
	>;
	readonly findById: (
		id: number,
	) => Effect.Effect<Song | null, E__SongsUnavailable>;
	readonly findActiveBySubmitter: (
		userId: string,
	) => Effect.Effect<Song | null, E__SongsUnavailable>;
	readonly insert: (
		input: I__SubmitSongInput & { readonly submittedByUserId: string },
	) => Effect.Effect<Song, E__SongsUnavailable>;
	readonly update: (
		input: I__UpdateSongInput,
	) => Effect.Effect<Song | null, E__SongsUnavailable>;
	readonly delete: (id: number) => Effect.Effect<void, E__SongsUnavailable>;
	readonly archive: (id: number) => Effect.Effect<void, E__SongsUnavailable>;
	readonly incrementActivePoints: () => Effect.Effect<
		void,
		E__SongsUnavailable
	>;
	readonly clear: () => Effect.Effect<void, E__SongsUnavailable>;
	readonly adjustPoints: (input: {
		readonly id: number;
		readonly points: number;
	}) => Effect.Effect<void, E__SongsUnavailable>;
	readonly adjustBananaStickers: (input: {
		readonly id: number;
		readonly delta: number;
	}) => Effect.Effect<void, E__SongsUnavailable>;
}

export class Svc__SongsRepository extends Context.Tag("Svc__SongsRepository")<
	Svc__SongsRepository,
	I__SongsRepository
>() {}

export const Layer_Repo__Songs = Layer.effect(
	Svc__SongsRepository,
	Effect.gen(function* () {
		const database = yield* Svc__Database;

		return {
			listActive: () =>
				database.query({
					ErrorClass: E__SongsUnavailable,
					fn: (db) =>
						db
							.select()
							.from(songs)
							.where(isNull(songs.archivedAt))
							.orderBy(
								desc(songs.bananaStickers),
								desc(songs.points),
								desc(songs.submittedAt),
							),
				}),
			listArchived: () =>
				database.query({
					ErrorClass: E__SongsUnavailable,
					fn: (db) =>
						db
							.select()
							.from(songs)
							.where(isNotNull(songs.archivedAt))
							.orderBy(desc(songs.archivedAt)),
				}),
			findById: (id) =>
				database
					.query({
						ErrorClass: E__SongsUnavailable,
						fn: (db) =>
							db.select().from(songs).where(eq(songs.id, id)).limit(1),
					})
					.pipe(Effect.map(([song]) => song ?? null)),
			findActiveBySubmitter: (userId) =>
				database
					.query({
						ErrorClass: E__SongsUnavailable,
						fn: (db) =>
							db
								.select()
								.from(songs)
								.where(
									and(
										eq(songs.submittedByUserId, userId),
										isNull(songs.archivedAt),
									),
								)
								.limit(1),
					})
					.pipe(Effect.map(([song]) => song ?? null)),
			insert: (input) =>
				database
					.query({
						ErrorClass: E__SongsUnavailable,
						fn: (db) =>
							db
								.insert(songs)
								.values({
									...input,
									submittedByUserId: input.submittedByUserId,
									submitterId: input.submittedByUserId,
									status: "pending",
									points: 1,
								})
								.returning(),
					})
					.pipe(
						Effect.flatMap(([song]) =>
							song
								? Effect.succeed(song)
								: Effect.die("Song insert returned no row"),
						),
					),
			update: ({ id, ...input }) =>
				database
					.query({
						ErrorClass: E__SongsUnavailable,
						fn: (db) =>
							db.update(songs).set(input).where(eq(songs.id, id)).returning(),
					})
					.pipe(Effect.map(([song]) => song ?? null)),
			delete: (id) =>
				database
					.query({
						ErrorClass: E__SongsUnavailable,
						fn: (db) => db.delete(songs).where(eq(songs.id, id)),
					})
					.pipe(Effect.asVoid),
			archive: (id) =>
				database
					.query({
						ErrorClass: E__SongsUnavailable,
						fn: (db) =>
							db
								.update(songs)
								.set({ archivedAt: new Date() })
								.where(eq(songs.id, id)),
					})
					.pipe(Effect.asVoid),
			incrementActivePoints: () =>
				database
					.query({
						ErrorClass: E__SongsUnavailable,
						fn: (db) =>
							db
								.update(songs)
								.set({ points: sql`${songs.points} + 1` })
								.where(isNull(songs.archivedAt)),
					})
					.pipe(Effect.asVoid),
			clear: () =>
				database
					.query({
						ErrorClass: E__SongsUnavailable,
						fn: (db) => db.delete(songs),
					})
					.pipe(Effect.asVoid),
			adjustPoints: ({ id, points }) =>
				database
					.query({
						ErrorClass: E__SongsUnavailable,
						fn: (db) =>
							db
								.update(songs)
								.set({ points: sql`GREATEST(${songs.points} + ${points}, 1)` })
								.where(eq(songs.id, id)),
					})
					.pipe(Effect.asVoid),
			adjustBananaStickers: ({ id, delta }) =>
				database
					.query({
						ErrorClass: E__SongsUnavailable,
						fn: (db) =>
							db
								.update(songs)
								.set({
									bananaStickers: sql`GREATEST(${songs.bananaStickers} + ${delta}, 0)`,
								})
								.where(eq(songs.id, id)),
					})
					.pipe(Effect.asVoid),
		} satisfies I__SongsRepository;
	}),
);
