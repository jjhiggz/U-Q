import { createFileRoute } from "@tanstack/react-router";
import { C_Page__AdminQueue } from "@/features/song-queue/admin-queue.page";

export const Route = createFileRoute("/admin")({
	component: C_Page__AdminQueue,
});
