import { describe, expect, it } from "vitest";
import ts from "typescript";
import { noUiImportsInRoutesOrPages } from "./no-ui-imports-in-routes-or-pages.ts";

function lint(code: string, fileName = "apps/web/src/routes/login.tsx") {
	const sourceFile = ts.createSourceFile(
		fileName,
		code,
		ts.ScriptTarget.ESNext,
		true,
		ts.ScriptKind.TSX,
	);
	return noUiImportsInRoutesOrPages().check(sourceFile, ts);
}

describe("no-ui-imports-in-routes-or-pages", () => {
	it("flags ui imports in routes", () => {
		const result = lint(`import { Button } from "@/components/ui/button";`);

		expect(result).toHaveLength(1);
		expect(result[0].rule).toBe("no-ui-imports-in-routes-or-pages");
	});

	it("flags ui imports in page files", () => {
		const result = lint(
			`import { Button } from "@/components/ui/button";`,
			"apps/web/src/features/login/login.page.tsx",
		);

		expect(result).toHaveLength(1);
	});

	it("allows ui imports in feature component files", () => {
		const result = lint(
			`import { Button } from "@/components/ui/button";`,
			"apps/web/src/features/login/components/C_LoginForm.tsx",
		);

		expect(result).toHaveLength(0);
	});
});
