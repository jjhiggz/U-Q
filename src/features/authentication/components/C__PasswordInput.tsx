import { match } from "ts-pattern";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, type InputProps } from "@/components/ui/input";

interface I_Props_C__PasswordInput extends InputProps {}

export function C__PasswordInput(props: I_Props_C__PasswordInput) {
	const [isVisible, setIsVisible] = useState(false);

	return (
		<div className="relative">
			<Input
				{...props}
				type={isVisible ? "text" : "password"}
				className="pr-10"
			/>
			<Button
				type="button"
				variant="ghost"
				size="icon"
				className="absolute right-0 top-0 h-10 w-10 text-muted-foreground hover:text-foreground"
				aria-label={isVisible ? "Hide password" : "Show password"}
				title={isVisible ? "Hide password" : "Show password"}
				onClick={() => setIsVisible((value) => !value)}
			>
				{match(isVisible)
					.with(true, () => <EyeOff className="size-4" />)
					.with(false, () => <Eye className="size-4" />)
					.exhaustive()}
			</Button>
		</div>
	);
}
