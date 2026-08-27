import { match } from "ts-pattern";
import { Link } from "@tanstack/react-router";
import { ListMusic, LogIn, Music, Plus, Radio } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

export function C__WelcomeHome() {
	const { data: session, isPending } = authClient.useSession();

	return (
		<main className="min-h-[calc(100vh-80px)]">
			<section className="px-4 py-14 md:py-20">
				<div className="mx-auto max-w-4xl">
					<div className="mb-10 max-w-2xl">
						<div className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground">
							<Radio className="size-4" />
							UQ
						</div>
						<h1 className="text-4xl font-bold tracking-normal md:text-6xl">
							Run a live submission queue.
						</h1>
						<p className="mt-4 text-lg text-muted-foreground">
							Create queues, make one active at your public handle, and let
							people submit without making them sign up first.
						</p>
					</div>

					<div className="mb-10 flex flex-wrap gap-3">
						{match({
							isPending,
							isSignedIn: !!session && !session.user.isAnonymous,
						})
							.with({ isPending: true }, () => (
								<Button disabled>
									<Radio className="size-4" />
									Loading
								</Button>
							))
							.with({ isSignedIn: true }, () => (
								<Link
									to="/queues"
									className={cn(buttonVariants({ size: "lg" }))}
								>
									<ListMusic className="size-4" />
									Your Queues
								</Link>
							))
							.otherwise(() => (
								<>
									<Link
										to="/signup"
										className={cn(buttonVariants({ size: "lg" }))}
									>
										<Plus className="size-4" />
										Create Your Queue
									</Link>
									<Link
										to="/login"
										className={cn(
											buttonVariants({ variant: "outline", size: "lg" }),
										)}
									>
										<LogIn className="size-4" />
										Sign In
									</Link>
								</>
							))}
					</div>

					<div className="grid gap-4 md:grid-cols-3">
						<HomeCard
							icon={<Plus className="size-5" />}
							title="Create"
							body="Name a private music queue from your dashboard."
						/>
						<HomeCard
							icon={<Radio className="size-5" />}
							title="Activate"
							body="Pick the one queue that should be live at /q/your-handle."
						/>
						<HomeCard
							icon={<Music className="size-5" />}
							title="Collect"
							body="Visitors can submit to the active queue with guest sessions."
						/>
					</div>
				</div>
			</section>
		</main>
	);
}

function HomeCard({
	icon,
	title,
	body,
}: {
	readonly icon: React.ReactNode;
	readonly title: string;
	readonly body: string;
}) {
	return (
		<Card>
			<CardContent className="p-5">
				<div className="mb-3 text-primary">{icon}</div>
				<div className="font-semibold">{title}</div>
				<div className="mt-1 text-sm text-muted-foreground">{body}</div>
			</CardContent>
		</Card>
	);
}
