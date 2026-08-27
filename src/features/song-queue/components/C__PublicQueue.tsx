import { match } from "ts-pattern";
import { Music, Radio } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useActivePublicLiveQueue } from "../queue.queries";

interface I_Props_C__PublicQueue {
	readonly handle: string;
}

export function C__PublicQueue({ handle }: I_Props_C__PublicQueue) {
	const activeQueue = useActivePublicLiveQueue(handle);

	return (
		<div className="min-h-[calc(100vh-80px)] p-4 max-w-4xl mx-auto">
			{match(activeQueue)
				.with({ isLoading: true }, () => (
					<div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
						<div className="text-lg">Loading queue...</div>
					</div>
				))
				.with({ isError: true }, () => (
					<Card className="mt-12">
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<Radio className="size-5" />
								No Active Queue
							</CardTitle>
						</CardHeader>
						<CardContent className="text-muted-foreground">
							@{handle} is not currently running a public queue.
						</CardContent>
					</Card>
				))
				.otherwise(({ data: queue }) =>
					match(queue)
						.with(undefined, () => null)
						.otherwise((queue) => (
							<div>
								<div className="mb-8 text-center">
									<h1 className="text-4xl font-bold mb-2 flex items-center justify-center gap-2">
										<Music className="size-10" />@{handle}
									</h1>
									<p className="text-muted-foreground">
										Submit to the active UQ queue.
									</p>
								</div>

								<Card>
									<CardHeader>
										<CardTitle>Active Queue</CardTitle>
									</CardHeader>
									<CardContent className="space-y-2">
										<div className="text-sm text-muted-foreground">
											This public link is currently pointed at a{" "}
											{queue.liveQueueType} queue.
										</div>
										<div className="text-xs text-muted-foreground">
											Music submissions will be wired into this queue next.
										</div>
									</CardContent>
								</Card>
							</div>
						)),
				)}
		</div>
	);
}
