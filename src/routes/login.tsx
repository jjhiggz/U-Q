import { createFileRoute } from "@tanstack/react-router";
import { C_Page__Login } from "@/features/authentication/login.page";

export const Route = createFileRoute("/login")({
	component: C_Page__Login,
});
