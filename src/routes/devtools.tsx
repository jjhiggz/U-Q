import { createFileRoute, notFound, redirect } from "@tanstack/react-router";
import { match } from "ts-pattern";
import { C_Page__Devtools } from "@/features/devtools/devtools.page";
import { SF_GetDevToolsStatus } from "@/features/devtools/devtools.functions";

export const Route = createFileRoute("/devtools")({
	loader: async () =>
		match(await SF_GetDevToolsStatus())
			.with({ _tag: "Success" }, ({ value }) => value)
			.with({ _tag: "Failure", error: { _tag: "E__DevToolsDisabled" } }, () => {
				throw notFound();
			})
			.with(
				{
					_tag: "Failure",
					error: { _tag: "E__AuthenticationRequired" },
				},
				() => {
					throw redirect({ to: "/login" });
				},
			)
			.with({ _tag: "Failure", error: { _tag: "E__GMAccessRequired" } }, () => {
				throw redirect({ to: "/login" });
			})
			.exhaustive(),
	component: C_Page__Devtools,
});
