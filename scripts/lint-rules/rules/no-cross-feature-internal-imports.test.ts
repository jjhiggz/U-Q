import { describe, expect, it } from "vitest";
import ts from "typescript";
import { noCrossFeatureInternalImports } from "./no-cross-feature-internal-imports.ts";

function lint(
	code: string,
	fileName = "apps/web/src/features/todos/components/C_Todos.tsx",
) {
	const sourceFile = ts.createSourceFile(
		fileName,
		code,
		ts.ScriptTarget.ESNext,
		true,
		ts.ScriptKind.TSX,
	);
	return noCrossFeatureInternalImports().check(sourceFile, ts);
}

describe("no-cross-feature-internal-imports", () => {
	it("flags imports from another feature inside a feature", () => {
		const result = lint(
			`import { C_UserCard } from "@/features/users/components/C_UserCard";`,
		);

		expect(result).toHaveLength(1);
		expect(result[0].rule).toBe("no-cross-feature-internal-imports");
	});

	it("allows imports from the same feature", () => {
		const result = lint(
			`import { C_TodoCard } from "@/features/todos/components/C_TodoCard";`,
		);

		expect(result).toHaveLength(0);
	});

	it("allows route files to import feature pages", () => {
		const result = lint(
			`import { C_Page__Todos } from "@/features/todos/todos.page";`,
			"apps/web/src/routes/todos.tsx",
		);

		expect(result).toHaveLength(0);
	});
});
