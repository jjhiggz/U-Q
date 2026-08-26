import { randomUUID } from "node:crypto";
import { Effect, Layer } from "effect";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { songs } from "@/db/schema";
import { user } from "@/server/auth/auth.table";
import {
	Layer__Database,
	Svc__Database,
} from "@/server/database/database.service";
import { Layer_Repo__Songs, Svc__SongsRepository } from "./songs.repository";

const userId = randomUUID();
const Layer__Test = Layer_Repo__Songs.pipe(Layer.provideMerge(Layer__Database));

const run = <A, E>(
	effect: Effect.Effect<A, E, Svc__Database | Svc__SongsRepository>,
) => Effect.runPromise(effect.pipe(Effect.provide(Layer__Test)));

describe("songs repository", () => {
	beforeAll(() =>
		run(
			Effect.gen(function* () {
				const database = yield* Svc__Database;
				yield* database.run((db) =>
					db.insert(user).values({
						id: userId,
						name: "Integration Guest",
						email: `${userId}@anonymous.local`,
						emailVerified: false,
						isAnonymous: true,
					}),
				);
			}),
		),
	);

	afterAll(() =>
		run(
			Effect.gen(function* () {
				const database = yield* Svc__Database;
				yield* database.run((db) =>
					db.delete(songs).where(eq(songs.submittedByUserId, userId)),
				);
				yield* database.run((db) => db.delete(user).where(eq(user.id, userId)));
			}),
		),
	);

	it("inserts and finds an active song by Better Auth user", async () => {
		const result = await run(
			Effect.gen(function* () {
				const repository = yield* Svc__SongsRepository;
				const inserted = yield* repository.insert({
					title: "Loser",
					artist: "Beck",
					submittedByUserId: userId,
				});
				const found = yield* repository.findActiveBySubmitter(userId);
				return { inserted, found };
			}),
		);

		expect(result.found?.id).toBe(result.inserted.id);
		expect(result.found?.submittedByUserId).toBe(userId);
	});
});
