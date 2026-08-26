import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { authClient } from "@/features/auth/auth-client";
import {
	useClearSongs,
	useDeleteSong,
	useSongs,
} from "@/features/song-queue/song-queue.queries";
import { Trash2, X } from "lucide-react";

export const Route = createFileRoute("/admin")({
	component: AdminPage,
});

function AdminPage() {
	const { data: session, isPending: isSessionPending } =
		authClient.useSession();
	const navigate = useNavigate();

	const { data: songs = [], isLoading } = useSongs();

	const deleteMutation = useDeleteSong();
	const clearMutation = useClearSongs();

	if (isSessionPending) {
		return (
			<div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
				<div className="text-lg">Loading...</div>
			</div>
		);
	}

	if (
		!session ||
		session.user.email.toLowerCase() !== "jonathan.higger@gmail.com"
	) {
		navigate({ to: "/login" });
		return null;
	}

	return (
		<div className="min-h-[calc(100vh-80px)] p-4 max-w-4xl mx-auto">
			<div className="mb-8">
				<h1 className="text-4xl font-bold mb-2">Admin - UQ</h1>
				<p className="text-muted-foreground">
					Manage and review submitted songs
				</p>
			</div>

			<div className="mb-4 flex gap-2">
				<Button
					variant="destructive"
					onClick={() => {
						if (confirm("Are you sure you want to clear the entire queue?")) {
							clearMutation.mutate();
						}
					}}
					disabled={clearMutation.isPending || songs.length === 0}
				>
					<Trash2 className="w-4 h-4 mr-2" />
					Clear All
				</Button>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Queue Management</CardTitle>
					<CardDescription>
						{songs.length === 0
							? "No songs in queue"
							: `${songs.length} song${songs.length === 1 ? "" : "s"} in queue`}
					</CardDescription>
				</CardHeader>
				<CardContent>
					{isLoading ? (
						<div className="text-center py-8 text-muted-foreground">
							Loading queue...
						</div>
					) : songs.length === 0 ? (
						<div className="text-center py-8 text-muted-foreground">
							Queue is empty
						</div>
					) : (
						<div className="space-y-2">
							{songs.map(
								(song: {
									id: number;
									title: string;
									artist: string;
									submittedAt: Date | string;
								}) => (
									<div
										key={song.id}
										className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors"
									>
										<div className="flex-1">
											<div className="font-medium">{song.title}</div>
											<div className="text-sm text-muted-foreground">
												{song.artist}
											</div>
											<div className="text-xs text-muted-foreground mt-1">
												Submitted: {new Date(song.submittedAt).toLocaleString()}
											</div>
										</div>
										<Button
											variant="ghost"
											size="icon"
											onClick={() => {
												if (
													confirm(`Delete "${song.title}" by ${song.artist}?`)
												) {
													deleteMutation.mutate({ id: song.id });
												}
											}}
											disabled={deleteMutation.isPending}
										>
											<X className="w-4 h-4" />
										</Button>
									</div>
								),
							)}
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
