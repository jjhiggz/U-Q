import { createFileRoute } from "@tanstack/react-router";
import { createElement } from "react";
import { C_Page__PublicQueue } from "@/features/song-queue/public-queue.page";

export const Route = createFileRoute("/q/$handle")({
	component: PublicQueueRoute,
});

function PublicQueueRoute() {
	const { handle } = Route.useParams();
	return createElement(C_Page__PublicQueue, { handle });
}
