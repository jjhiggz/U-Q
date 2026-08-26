import {
	Cause,
	Context,
	Data,
	Effect,
	Exit,
	FiberRef,
	Layer,
	Option,
	Ref,
	Runtime,
} from "effect";
import type { Scope } from "effect";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { match } from "ts-pattern";
import { Pool } from "pg";
import * as songSchema from "@/db/schema";
import * as authSchema from "@/server/auth/auth.table";

export const databaseSchema = {
	...authSchema,
	...songSchema,
};

export type DrizzleRootDatabase = NodePgDatabase<typeof databaseSchema>;
export type DrizzleTransaction = Parameters<
	Parameters<DrizzleRootDatabase["transaction"]>[0]
>[0];
export type DrizzleDatabase = DrizzleRootDatabase | DrizzleTransaction;

export const DEFAULT_DATABASE_URL =
	process.env.DATABASE_URL ??
	"postgresql://musicqueue:musicqueue@localhost:55432/musicqueue";

export class E__DbUniqueViolation extends Data.TaggedError(
	"E__DbUniqueViolation",
)<{
	readonly driverError: unknown;
}> {}

export class E__DbUnavailable extends Data.TaggedError("E__DbUnavailable")<{
	readonly driverError: unknown;
}> {}

export class E__DbForeignKeyViolation extends Data.TaggedError(
	"E__DbForeignKeyViolation",
)<{
	readonly driverError: unknown;
}> {}

export type DbQueryError =
	| E__DbUniqueViolation
	| E__DbUnavailable
	| E__DbForeignKeyViolation;

interface I__DatabaseService {
	readonly current: Effect.Effect<DrizzleDatabase>;
	readonly run: <A>(
		fn: (database: DrizzleDatabase) => Promise<A>,
	) => Effect.Effect<A, DbQueryError>;
	readonly query: <A, E extends { readonly message: string }>(args: {
		readonly ErrorClass: new (args: { readonly message: string }) => E;
		readonly fn: (database: DrizzleDatabase) => Promise<A>;
	}) => Effect.Effect<A, E>;
	readonly transaction: <A, E, R>(
		effect: Effect.Effect<A, E, R>,
	) => Effect.Effect<A, E | DbQueryError, R>;
}

export class Svc__Database extends Context.Tag("Svc__Database")<
	Svc__Database,
	I__DatabaseService
>() {}

export const Layer__Database = Layer.scoped(
	Svc__Database,
	Effect.acquireRelease(
		Effect.sync(() => {
			const pool = new Pool({
				connectionString: DEFAULT_DATABASE_URL,
				max: 5,
			});

			return {
				database: drizzle(pool, { schema: databaseSchema }),
				pool,
			};
		}),
		({ pool }) => Effect.promise(() => pool.end()),
	).pipe(Effect.flatMap(({ database }) => makeDatabaseService(database))),
);

function makeDatabaseService(
	rootDatabase: DrizzleRootDatabase,
): Effect.Effect<I__DatabaseService, never, Scope.Scope> {
	return Effect.gen(function* () {
		const currentTransaction = yield* FiberRef.make<DrizzleTransaction | null>(
			null,
		);
		const current = FiberRef.get(currentTransaction).pipe(
			Effect.map((transaction) => transaction ?? rootDatabase),
		);
		const run = <A>(fn: (database: DrizzleDatabase) => Promise<A>) =>
			current.pipe(
				Effect.flatMap((database) => runDatabasePromise(() => fn(database))),
			);
		const query = <A, E extends { readonly message: string }>(args: {
			readonly ErrorClass: new (args: { readonly message: string }) => E;
			readonly fn: (database: DrizzleDatabase) => Promise<A>;
		}) =>
			run(args.fn).pipe(
				Effect.mapError(
					(error) =>
						new args.ErrorClass({ message: getDatabaseErrorMessage(error) }),
				),
			);
		const transaction = <A, E, R>(
			effect: Effect.Effect<A, E, R>,
		): Effect.Effect<A, E | DbQueryError, R> =>
			Effect.gen(function* () {
				const activeTransaction = yield* FiberRef.get(currentTransaction);

				if (activeTransaction) {
					return yield* effect;
				}

				const runtime = yield* Effect.runtime<R>();
				const rollbackCause = yield* Ref.make<Option.Option<Cause.Cause<E>>>(
					Option.none(),
				);

				return yield* Effect.tryPromise({
					try: () =>
						rootDatabase.transaction(async (databaseTransaction) => {
							const exit = await Runtime.runPromiseExit(runtime)(
								Effect.locally(effect, currentTransaction, databaseTransaction),
							);

							if (Exit.isSuccess(exit)) {
								return exit.value;
							}

							await Runtime.runPromise(runtime)(
								Ref.set(rollbackCause, Option.some(exit.cause)),
							);
							return databaseTransaction.rollback();
						}),
					catch: (error) => error,
				}).pipe(
					Effect.catchAll((error) =>
						Ref.get(rollbackCause).pipe(
							Effect.flatMap(
								(cause): Effect.Effect<never, E | DbQueryError> => {
									if (Option.isSome(cause)) {
										return Effect.failCause(cause.value);
									}

									const databaseError = classifyDatabaseError(error);
									return databaseError
										? Effect.fail(databaseError)
										: Effect.die(error);
								},
							),
						),
					),
				);
			});

		return { current, query, run, transaction };
	});
}

export function runDatabasePromise<A>(
	fn: () => Promise<A>,
): Effect.Effect<A, DbQueryError> {
	return Effect.async<A, DbQueryError>((resume) => {
		Promise.resolve()
			.then(fn)
			.then((value) => resume(Effect.succeed(value)))
			.catch((error: unknown) => {
				const databaseError = classifyDatabaseError(error);
				resume(databaseError ? Effect.fail(databaseError) : Effect.die(error));
			});
	});
}

export function classifyDatabaseError(error: unknown): DbQueryError | null {
	return match(getDriverErrorCode(error))
		.with("23505", () => new E__DbUniqueViolation({ driverError: error }))
		.with("23503", () => new E__DbForeignKeyViolation({ driverError: error }))
		.with("ECONNREFUSED", () => new E__DbUnavailable({ driverError: error }))
		.otherwise(() => null);
}

function getDriverErrorCode(error: unknown): string | undefined {
	if (!error || typeof error !== "object") return undefined;

	const code = "code" in error ? error.code : undefined;
	if (typeof code === "string") return code;

	const cause = "cause" in error ? error.cause : undefined;
	return getDriverErrorCode(cause);
}

function getDatabaseErrorMessage(error: DbQueryError): string {
	return match(error)
		.with(
			{ _tag: "E__DbUniqueViolation" },
			() => "Database unique constraint violation.",
		)
		.with(
			{ _tag: "E__DbForeignKeyViolation" },
			() => "Database foreign key violation.",
		)
		.with(
			{ _tag: "E__DbUnavailable" },
			() => "Could not connect to the database.",
		)
		.exhaustive();
}
