import { match } from "ts-pattern";
import { useNavigate } from "@tanstack/react-router";
import { CheckCircle, Loader2, Music, Plus, Radio } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import {
	useCreateMusicQueue,
	useOwnedQueues,
	useSetActiveQueue,
} from "../queue.queries";

export function C__QueuesDashboard() {
	const { data: session, isPending: isSessionPending } =
		authClient.useSession();
	const navigate = useNavigate();
	const [queueName, setQueueName] = useState("");
	const ownedQueues = useOwnedQueues();
	const createQueue = useCreateMusicQueue();
	const setActiveQueue = useSetActiveQueue();

	const handleCreateQueue = (event: React.FormEvent) => {
		event.preventDefault();
		const name = queueName.trim();
		if (!name) return;

		createQueue.mutate(
			{ name, visibility: "private" },
			{ onSuccess: () => setQueueName("") },
		);
	};

	return match({
		isSessionPending,
		isSignedIn: !!session && !session.user.isAnonymous,
	})
		.with({ isSessionPending: true }, () => (
			<CenteredMessage label="Loading..." />
		))
		.with({ isSignedIn: false }, () => {
			navigate({ to: "/login" });
			return null;
		})
		.otherwise(() => (
			<div className="min-h-[calc(100vh-80px)] p-4 max-w-4xl mx-auto">
				<div className="mb-8">
					<h1 className="text-4xl font-bold mb-2">Your Queues</h1>
					<p className="text-muted-foreground">
						Create queues and choose which one is live at your public link.
					</p>
				</div>

				<Card className="mb-6">
					<CardHeader>
						<CardTitle>Create Music Queue</CardTitle>
						<CardDescription>
							Queue names are private labels for your dashboard.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<form onSubmit={handleCreateQueue} className="flex gap-3">
							<Input
								value={queueName}
								onChange={(event) => setQueueName(event.target.value)}
								placeholder="Friday Feedback"
								maxLength={120}
							/>
							<Button
								type="submit"
								disabled={
									createQueue.isPending || queueName.trim().length === 0
								}
							>
								{match(createQueue.isPending)
									.with(true, () => <Loader2 className="size-4 animate-spin" />)
									.with(false, () => <Plus className="size-4" />)
									.exhaustive()}
								Create
							</Button>
						</form>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Owned Queues</CardTitle>
						<CardDescription>
							Make one queue active to run it from your public handle link.
						</CardDescription>
					</CardHeader>
					<CardContent>
						{match(ownedQueues)
							.with({ isLoading: true }, () => (
								<CenteredMessage label="Loading queues..." />
							))
							.otherwise(({ data: queues = [] }) =>
								match(queues.length)
									.with(0, () => (
										<div className="text-center py-8 text-muted-foreground">
											No queues yet.
										</div>
									))
									.otherwise(() => (
										<div className="space-y-3">
											{queues.map((queue) => (
												<div
													key={queue.id}
													className="flex items-center justify-between gap-4 rounded-lg border p-4"
												>
													<div className="min-w-0">
														<div className="flex items-center gap-2 font-medium">
															<Music className="size-4" />
															{queue.name}
															{queue.visibility === "unlisted" && (
																<span className="inline-flex items-center gap-1 text-xs text-green-600">
																	<CheckCircle className="size-3" />
																	Public-ready
																</span>
															)}
														</div>
														<div className="text-sm text-muted-foreground">
															{queue.queueType} · {queue.visibility}
														</div>
													</div>
													<Button
														variant="outline"
														size="sm"
														disabled={setActiveQueue.isPending}
														onClick={() =>
															setActiveQueue.mutate({ queueId: queue.id })
														}
													>
														<Radio className="size-4" />
														Make Active
													</Button>
												</div>
											))}
										</div>
									)),
							)}
					</CardContent>
				</Card>
			</div>
		));
}

function CenteredMessage({ label }: { readonly label: string }) {
	return (
		<div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
			<div className="text-lg">{label}</div>
		</div>
	);
}
