import { Link } from "@tanstack/react-router";
import { LogIn, LogOut, Music } from "lucide-react";
import { authClient } from "@/features/auth/auth-client";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function Header() {
	const { data: session } = authClient.useSession();

	return (
		<header className="p-4 flex items-center justify-between bg-gray-800 text-white shadow-lg">
			<Link to="/" className="flex items-center gap-2">
				<Music className="w-6 h-6" />
				<h1 className="text-xl font-semibold">UQ</h1>
			</Link>
			{session && !session.user.isAnonymous ? (
				<div className="flex items-center gap-3">
					<span className="text-sm">
						{session.user.name || session.user.email}
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
			) : (
				<Link to="/login" className={cn(buttonVariants({ variant: "ghost" }))}>
					<LogIn className="size-4" />
					Sign in
				</Link>
			)}
		</header>
	);
}
