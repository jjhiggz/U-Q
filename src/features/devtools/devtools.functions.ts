import {
	createMiddleware,
	createServerFn as SF,
	createServerOnlyFn,
} from "@tanstack/react-start";
import { MW_Access_GM } from "@/server/middleware/operation.middleware";
import type {
	I__RemoteFailure,
	RemoteResult,
} from "@/server/effect/remote-result";

export interface E__DevToolsDisabled {
	readonly _tag: "E__DevToolsDisabled";
	readonly message: string;
}

type RunDevTools = <A, E extends I__RemoteFailure>(
	operation: () => Promise<RemoteResult<A, E>>,
) => Promise<RemoteResult<A, E | E__DevToolsDisabled>>;

const getOperation = createServerOnlyFn(
	() => import("./server/devtools.operation"),
);

export const MW_Feature_DevTools = createMiddleware({
	type: "function",
}).server(({ next }) => {
	const runDevTools: RunDevTools =
		process.env.ENABLE_DEV_TOOLS === "true"
			? (operation) => operation()
			: async () => ({
					_tag: "Failure",
					error: {
						_tag: "E__DevToolsDisabled",
						message: "Dev tools are disabled.",
					},
				});
	return next<{ runDevTools: RunDevTools }>({ context: { runDevTools } });
});

export const SF_GetDevToolsStatus = SF({ method: "GET" })
	.middleware([MW_Feature_DevTools, MW_Access_GM])
	.handler(async ({ context }) => {
		const { getDevToolsStatusOperation } = await getOperation();
		return context.runDevTools(() =>
			context.runGM(getDevToolsStatusOperation()),
		);
	});
