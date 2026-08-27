import { Context, Data, Effect, Layer } from "effect";
import { and, eq } from "drizzle-orm";
import { liveQueues, type NewLiveQueue, type LiveQueue } from "@/db/schema";
import { user } from "@/server/auth/auth.table";
import { Svc__Database } from "@/server/database/database.service";

export class E__LiveQueuesUnavailable extends Data.TaggedError(
	"E__LiveQueuesUnavailable",
)<{
	readonly message: string;
}> {}

interface I__LiveQueuesRepository {
	readonly listOwned: (
		ownerUserId: string,
	) => Effect.Effect<readonly LiveQueue[], E__LiveQueuesUnavailable>;
	readonly createMusicLiveQueue: (input: {
		readonly ownerUserId: string;
		readonly name: string;
		readonly visibility: "private" | "unlisted";
	}) => Effect.Effect<LiveQueue, E__LiveQueuesUnavailable>;
	readonly findOwnedById: (input: {
		readonly ownerUserId: string;
		readonly liveQueueId: string;
	}) => Effect.Effect<LiveQueue | null, E__LiveQueuesUnavailable>;
	readonly findActivePublicByHandle: (
		handle: string,
	) => Effect.Effect<LiveQueue | null, E__LiveQueuesUnavailable>;
	readonly setActiveLiveQueue: (input: {
		readonly ownerUserId: string;
		readonly liveQueueId: string;
	}) => Effect.Effect<LiveQueue, E__LiveQueuesUnavailable>;
	readonly clearActiveLiveQueue: (
		ownerUserId: string,
	) => Effect.Effect<void, E__LiveQueuesUnavailable>;
}

export class Svc__LiveQueuesRepository extends Context.Tag(
	"Svc__LiveQueuesRepository",
)<Svc__LiveQueuesRepository, I__LiveQueuesRepository>() {}

export const Layer_Repo__LiveQueues = Layer.effect(
	Svc__LiveQueuesRepository,
	Effect.gen(function* () {
		const database = yield* Svc__Database;

		const findOwnedById = ({
			ownerUserId,
			liveQueueId,
		}: {
			readonly ownerUserId: string;
			readonly liveQueueId: string;
		}) =>
			database
				.query({
					ErrorClass: E__LiveQueuesUnavailable,
					fn: (db) =>
						db
							.select()
							.from(liveQueues)
							.where(
								and(
									eq(liveQueues.id, liveQueueId),
									eq(liveQueues.ownerUserId, ownerUserId),
								),
							)
							.limit(1),
				})
				.pipe(Effect.map(([queue]) => queue ?? null));

		return {
			listOwned: (ownerUserId) =>
				database.query({
					ErrorClass: E__LiveQueuesUnavailable,
					fn: (db) =>
						db
							.select()
							.from(liveQueues)
							.where(eq(liveQueues.ownerUserId, ownerUserId)),
				}),
			createMusicLiveQueue: ({ ownerUserId, name, visibility }) =>
				database
					.query({
						ErrorClass: E__LiveQueuesUnavailable,
						fn: (db) =>
							db
								.insert(liveQueues)
								.values({
									ownerUserId,
									name,
									visibility,
									liveQueueType: "music",
								} satisfies NewLiveQueue)
								.returning(),
					})
					.pipe(
						Effect.flatMap(([queue]) =>
							queue
								? Effect.succeed(queue)
								: Effect.die("LiveQueue insert returned no row"),
						),
					),
			findOwnedById,
			findActivePublicByHandle: (handle) =>
				database
					.query({
						ErrorClass: E__LiveQueuesUnavailable,
						fn: (db) =>
							db
								.select({ queue: liveQueues })
								.from(user)
								.innerJoin(
									liveQueues,
									eq(user.activeLiveQueueId, liveQueues.id),
								)
								.where(
									and(
										eq(user.handle, handle),
										eq(liveQueues.visibility, "unlisted"),
									),
								)
								.limit(1),
					})
					.pipe(Effect.map(([row]) => row?.queue ?? null)),
			setActiveLiveQueue: ({ ownerUserId, liveQueueId }) =>
				database
					.transaction(
						Effect.gen(function* () {
							const ownedQueue = yield* findOwnedById({
								ownerUserId,
								liveQueueId,
							});
							if (!ownedQueue) {
								return yield* new E__LiveQueuesUnavailable({
									message: "LiveQueue not found.",
								});
							}

							const [activatedQueue] = yield* database.query({
								ErrorClass: E__LiveQueuesUnavailable,
								fn: (db) =>
									db
										.update(liveQueues)
										.set({ visibility: "unlisted", updatedAt: new Date() })
										.where(eq(liveQueues.id, liveQueueId))
										.returning(),
							});

							yield* database.query({
								ErrorClass: E__LiveQueuesUnavailable,
								fn: (db) =>
									db
										.update(user)
										.set({ activeLiveQueueId: liveQueueId })
										.where(eq(user.id, ownerUserId)),
							});

							if (!activatedQueue) {
								return yield* new E__LiveQueuesUnavailable({
									message: "LiveQueue not found.",
								});
							}

							return activatedQueue;
						}),
					)
					.pipe(
						Effect.mapError(
							() =>
								new E__LiveQueuesUnavailable({
									message: "The queue is temporarily unavailable.",
								}),
						),
					),
			clearActiveLiveQueue: (ownerUserId) =>
				database
					.query({
						ErrorClass: E__LiveQueuesUnavailable,
						fn: (db) =>
							db
								.update(user)
								.set({ activeLiveQueueId: null })
								.where(eq(user.id, ownerUserId)),
					})
					.pipe(Effect.asVoid),
		} satisfies I__LiveQueuesRepository;
	}),
);
