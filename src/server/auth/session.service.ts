import { Context, Layer } from "effect";
import type { AuthSession } from "./auth";

export interface I__SessionService {
	readonly session: AuthSession;
}

export class Svc__Session extends Context.Tag("Svc__Session")<
	Svc__Session,
	I__SessionService
>() {}

export interface I__GMAccessService {
	readonly session: AuthSession;
}

export class Svc__GMAccess extends Context.Tag("Svc__GMAccess")<
	Svc__GMAccess,
	I__GMAccessService
>() {}

export const Layer__Session = (session: AuthSession) =>
	Layer.succeed(Svc__Session, { session });

export const Layer__GMAccess = (session: AuthSession) =>
	Layer.mergeAll(
		Layer__Session(session),
		Layer.succeed(Svc__GMAccess, { session }),
	);
