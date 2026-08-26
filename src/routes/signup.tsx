import { createFileRoute } from "@tanstack/react-router";
import { C_Page__Signup } from "@/features/authentication/signup.page";

export const Route = createFileRoute("/signup")({
	component: C_Page__Signup,
});
