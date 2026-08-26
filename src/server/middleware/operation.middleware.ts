import { createMiddleware, createServerOnlyFn } from "@tanstack/react-start";
import type { Effect } from "effect";
import type {
	Svc__GMAccess,
	Svc__Session,
} from "@/server/auth/session.service";
import type { Svc__Songs } from "@/features/song-queue/server/songs.service";
import type {
	I__RemoteFailure,
	RemoteResult,
} from "@/server/effect/remote-result";

const GM_EMAIL = "jonathan.higger@gmail.com";

export interface E__AuthenticationRequired {
	readonly _tag: "E__AuthenticationRequired";
	readonly message: string;
}

export interface E__GMAccessRequired {
	readonly _tag: "E__GMAccessRequired";
	readonly message: string;
}

type RunSession = <A, E extends I__RemoteFailure>(
	operation: Effect.Effect<A, E, Svc__Session | Svc__Songs>,
) => Promise<RemoteResult<A, E | E__AuthenticationRequired>>;

type RunGM = <A, E extends I__RemoteFailure>(
	operation: Effect.Effect<A, E, Svc__GMAccess | Svc__Session | Svc__Songs>,
) => Promise<
	RemoteResult<A, E | E__AuthenticationRequired | E__GMAccessRequired>
>;
const getPublicRunner = createServerOnlyFn(
	async () => (await import("@/server/effect/runtime")).runOperation,
);
const getSessionDependencies = createServerOnlyFn(async () => {
	const [{ getRequestHeaders }, { auth }, session, runtime] = await Promise.all(
		[
			import("@tanstack/react-start/server"),
			import("@/server/auth/auth"),
			import("@/server/auth/session.service"),
			import("@/server/effect/runtime"),
		],
	);
	return { getRequestHeaders, auth, session, runtime };
});

export const MW_Operation_Public = createMiddleware({
	type: "function",
}).server(async ({ next }) => {
	const runOperation = await getPublicRunner();
	return next<{ run: typeof runOperation }>({ context: { run: runOperation } });
});

export const MW_Access_Session = createMiddleware({ type: "function" }).server(
	async ({ next }) => {
		const dependencies = await getSessionDependencies();
		const session = await dependencies.auth.api.getSession({
			headers: dependencies.getRequestHeaders(),
		});
		if (!session) {
			const runSession: RunSession = async () => ({
				_tag: "Failure",
				error: {
					_tag: "E__AuthenticationRequired",
					message: "Authentication required.",
				},
			});
			return next<{ runSession: RunSession }>({ context: { runSession } });
		}
		const runSession: RunSession = dependencies.runtime.runOperationWith(
			dependencies.session.Layer__Session(session),
		);
		return next<{ runSession: typeof runSession }>({ context: { runSession } });
	},
);

export const MW_Access_GM = createMiddleware({ type: "function" }).server(
	async ({ next }) => {
		const dependencies = await getSessionDependencies();
		const session = await dependencies.auth.api.getSession({
			headers: dependencies.getRequestHeaders(),
		});
		if (!session) {
			const runGM: RunGM = async () => ({
				_tag: "Failure",
				error: {
					_tag: "E__AuthenticationRequired",
					message: "Authentication required.",
				},
			});
			return next<{ runGM: RunGM }>({ context: { runGM } });
		}
		if (session.user.email.toLowerCase() !== GM_EMAIL) {
			const runGM: RunGM = async () => ({
				_tag: "Failure",
				error: {
					_tag: "E__GMAccessRequired",
					message: "GM access required.",
				},
			});
			return next<{ runGM: RunGM }>({ context: { runGM } });
		}
		const runGM: RunGM = dependencies.runtime.runOperationWith(
			dependencies.session.Layer__GMAccess(session),
		);
		return next<{ runGM: typeof runGM }>({ context: { runGM } });
	},
);
