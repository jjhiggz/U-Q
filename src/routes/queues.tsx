import { createFileRoute } from "@tanstack/react-router";
import { C_Page__Queues } from "@/features/song-queue/queues.page";

export const Route = createFileRoute("/queues")({
	component: C_Page__Queues,
});
