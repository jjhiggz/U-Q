import { createFileRoute, notFound, redirect } from "@tanstack/react-router";
import { Wrench } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SF_GetDevToolsStatus } from "@/features/devtools/devtools.functions";
import { unwrapRemoteResult } from "@/server/effect/remote-result";

export const Route = createFileRoute("/devtools")({
	loader: async () => {
		const result = await SF_GetDevToolsStatus();
		if (result._tag === "Failure") {
			switch (result.error._tag) {
				case "E__DevToolsDisabled":
					throw notFound();
				case "E__AuthenticationRequired":
				case "E__GMAccessRequired":
					throw redirect({ to: "/login" });
			}
		}
		return unwrapRemoteResult(result);
	},
	component: DevToolsPage,
});

function DevToolsPage() {
	const status = Route.useLoaderData();
	return (
		<main className="mx-auto min-h-[calc(100vh-80px)] max-w-4xl p-4 pt-12">
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Wrench className="size-5" />
						Dev tools
					</CardTitle>
				</CardHeader>
				<CardContent className="text-muted-foreground">
					{status.message}
				</CardContent>
			</Card>
		</main>
	);
}
