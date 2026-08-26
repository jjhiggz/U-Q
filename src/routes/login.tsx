import { useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { authClient } from "@/features/auth/auth-client";

export const Route = createFileRoute("/login")({ component: LoginPage });

function LoginPage() {
	const navigate = useNavigate();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [isPending, setIsPending] = useState(false);

	const submit = async (event: React.FormEvent) => {
		event.preventDefault();
		setError(null);
		setIsPending(true);
		const result = await authClient.signIn.email({ email, password });
		setIsPending(false);

		if (result.error) {
			setError(result.error.message ?? "Could not sign in.");
			return;
		}
		await navigate({ to: "/" });
	};

	return (
		<main className="mx-auto flex min-h-[calc(100vh-80px)] max-w-md items-center p-4">
			<Card className="w-full">
				<CardHeader>
					<CardTitle>Sign in</CardTitle>
				</CardHeader>
				<CardContent>
					<form className="space-y-4" onSubmit={submit}>
						<Input
							type="email"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							placeholder="Email"
							required
						/>
						<Input
							type="password"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							placeholder="Password"
							required
						/>
						{error && <p className="text-sm text-destructive">{error}</p>}
						<Button className="w-full" type="submit" disabled={isPending}>
							{isPending ? "Signing in..." : "Sign in"}
						</Button>
						<p className="text-center text-sm text-muted-foreground">
							No account?{" "}
							<Link to="/signup" className="underline">
								Sign up
							</Link>
						</p>
					</form>
				</CardContent>
			</Card>
		</main>
	);
}
