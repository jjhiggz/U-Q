import { createFileRoute } from "@tanstack/react-router";
import { C_Page__SongQueue } from "@/features/song-queue/song-queue.page";

export const Route = createFileRoute("/")({
	component: C_Page__SongQueue,
});
