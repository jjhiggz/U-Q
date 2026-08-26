import { Wrench } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface I_Props_C__Devtools {
	readonly message: string;
}

export function C__Devtools({ message }: I_Props_C__Devtools) {
	return (
		<main className="mx-auto min-h-[calc(100vh-80px)] max-w-4xl p-4 pt-12">
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Wrench className="size-5" />
						Dev tools
					</CardTitle>
				</CardHeader>
				<CardContent className="text-muted-foreground">{message}</CardContent>
			</Card>
		</main>
	);
}
