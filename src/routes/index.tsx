import { createFileRoute } from "@tanstack/react-router";
import { C_Page__Home } from "@/features/home/home.page";

export const Route = createFileRoute("/")({
	component: C_Page__Home,
});
