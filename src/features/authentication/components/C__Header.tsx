import { match } from "ts-pattern";
import { Link } from "@tanstack/react-router";
import { LogIn, LogOut, Music } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function C__Header() {
	const { data: session } = authClient.useSession();

	return (
		<header className="p-4 flex items-center justify-between bg-gray-800 text-white shadow-lg">
			<Link to="/" className="flex items-center gap-2">
				<Music className="w-6 h-6" />
				<h1 className="text-xl font-semibold">UQ</h1>
			</Link>
			{match(session)
				.with({ user: { isAnonymous: false } }, (session) => (
					<div className="flex items-center gap-3">
						<span className="text-sm">
							{session.user.name ?? session.user.email}
						</span>
						<Button
							variant="ghost"
							size="icon"
							title="Sign out"
							onClick={() => authClient.signOut()}
						>
							<LogOut className="size-4" />
						</Button>
					</div>
				))
				.otherwise(() => (
					<Link
						to="/login"
						className={cn(buttonVariants({ variant: "ghost" }))}
					>
						<LogIn className="size-4" />
						Sign in
					</Link>
				))}
		</header>
	);
}
