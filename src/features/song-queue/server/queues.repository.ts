import { Context, Data, Effect, Layer } from "effect";
import { and, eq } from "drizzle-orm";
import { queues, type NewQueue, type Queue } from "@/db/schema";
import { user } from "@/server/auth/auth.table";
import { Svc__Database } from "@/server/database/database.service";

export class E__QueuesUnavailable extends Data.TaggedError(
	"E__QueuesUnavailable",
)<{
	readonly message: string;
}> {}

interface I__QueuesRepository {
	readonly listOwned: (
		ownerUserId: string,
	) => Effect.Effect<readonly Queue[], E__QueuesUnavailable>;
	readonly createMusicQueue: (input: {
		readonly ownerUserId: string;
		readonly name: string;
		readonly visibility: "private" | "unlisted";
	}) => Effect.Effect<Queue, E__QueuesUnavailable>;
	readonly findOwnedById: (input: {
		readonly ownerUserId: string;
		readonly queueId: string;
	}) => Effect.Effect<Queue | null, E__QueuesUnavailable>;
	readonly findActivePublicByHandle: (
		handle: string,
	) => Effect.Effect<Queue | null, E__QueuesUnavailable>;
	readonly setActiveQueue: (input: {
		readonly ownerUserId: string;
		readonly queueId: string;
	}) => Effect.Effect<Queue, E__QueuesUnavailable>;
	readonly clearActiveQueue: (
		ownerUserId: string,
	) => Effect.Effect<void, E__QueuesUnavailable>;
}

export class Svc__QueuesRepository extends Context.Tag("Svc__QueuesRepository")<
	Svc__QueuesRepository,
	I__QueuesRepository
>() {}

export const Layer_Repo__Queues = Layer.effect(
	Svc__QueuesRepository,
	Effect.gen(function* () {
		const database = yield* Svc__Database;

		const findOwnedById = ({
			ownerUserId,
			queueId,
		}: {
			readonly ownerUserId: string;
			readonly queueId: string;
		}) =>
			database
				.query({
					ErrorClass: E__QueuesUnavailable,
					fn: (db) =>
						db
							.select()
							.from(queues)
							.where(
								and(
									eq(queues.id, queueId),
									eq(queues.ownerUserId, ownerUserId),
								),
							)
							.limit(1),
				})
				.pipe(Effect.map(([queue]) => queue ?? null));

		return {
			listOwned: (ownerUserId) =>
				database.query({
					ErrorClass: E__QueuesUnavailable,
					fn: (db) =>
						db.select().from(queues).where(eq(queues.ownerUserId, ownerUserId)),
				}),
			createMusicQueue: ({ ownerUserId, name, visibility }) =>
				database
					.query({
						ErrorClass: E__QueuesUnavailable,
						fn: (db) =>
							db
								.insert(queues)
								.values({
									ownerUserId,
									name,
									visibility,
									queueType: "music",
								} satisfies NewQueue)
								.returning(),
					})
					.pipe(
						Effect.flatMap(([queue]) =>
							queue
								? Effect.succeed(queue)
								: Effect.die("Queue insert returned no row"),
						),
					),
			findOwnedById,
			findActivePublicByHandle: (handle) =>
				database
					.query({
						ErrorClass: E__QueuesUnavailable,
						fn: (db) =>
							db
								.select({ queue: queues })
								.from(user)
								.innerJoin(queues, eq(user.activeQueueId, queues.id))
								.where(
									and(
										eq(user.handle, handle),
										eq(queues.visibility, "unlisted"),
									),
								)
								.limit(1),
					})
					.pipe(Effect.map(([row]) => row?.queue ?? null)),
			setActiveQueue: ({ ownerUserId, queueId }) =>
				database
					.transaction(
						Effect.gen(function* () {
							const ownedQueue = yield* findOwnedById({ ownerUserId, queueId });
							if (!ownedQueue) {
								return yield* new E__QueuesUnavailable({
									message: "Queue not found.",
								});
							}

							const [activatedQueue] = yield* database.query({
								ErrorClass: E__QueuesUnavailable,
								fn: (db) =>
									db
										.update(queues)
										.set({ visibility: "unlisted", updatedAt: new Date() })
										.where(eq(queues.id, queueId))
										.returning(),
							});

							yield* database.query({
								ErrorClass: E__QueuesUnavailable,
								fn: (db) =>
									db
										.update(user)
										.set({ activeQueueId: queueId })
										.where(eq(user.id, ownerUserId)),
							});

							return yield* activatedQueue
								? Effect.succeed(activatedQueue)
								: new E__QueuesUnavailable({ message: "Queue not found." });
						}),
					)
					.pipe(
						Effect.mapError(
							() =>
								new E__QueuesUnavailable({
									message: "The queue is temporarily unavailable.",
								}),
						),
					),
			clearActiveQueue: (ownerUserId) =>
				database
					.query({
						ErrorClass: E__QueuesUnavailable,
						fn: (db) =>
							db
								.update(user)
								.set({ activeQueueId: null })
								.where(eq(user.id, ownerUserId)),
					})
					.pipe(Effect.asVoid),
		} satisfies I__QueuesRepository;
	}),
);
