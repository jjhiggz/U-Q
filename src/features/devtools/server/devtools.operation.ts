import { Effect } from "effect";
import { Svc__GMAccess } from "@/server/auth/session.service";

export const getDevToolsStatusOperation = () =>
	Effect.gen(function* () {
		yield* Svc__GMAccess;
		return { message: "Coming in the future." } as const;
	});
