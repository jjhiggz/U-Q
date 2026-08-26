import { describe, expect, it } from "vitest";
import ts from "typescript";
import { noUnnecessaryIndexFiles } from "./no-unnecessary-index-files.ts";

function lint(code: string, fileName: string) {
	const sourceFile = ts.createSourceFile(
		fileName,
		code,
		ts.ScriptTarget.ESNext,
		true,
		ts.ScriptKind.TSX,
	);
	return noUnnecessaryIndexFiles().check(sourceFile, ts);
}

describe("no-unnecessary-index-files", () => {
	it("flags nested index.ts barrel files", () => {
		const result = lint(
			`export { F_Seed__User } from "./users.factory";`,
			"apps/backend/src/devtools/seeding/index.ts",
		);

		expect(result).toHaveLength(1);
		expect(result[0].rule).toBe("no-unnecessary-index-files");
	});

	it("flags nested index.tsx barrel files outside routes", () => {
		const result = lint(
			`export { C_Menu } from "./C_Menu";`,
			"apps/web/src/features/workspace/sidebar/index.tsx",
		);

		expect(result).toHaveLength(1);
	});

	it("allows TanStack route index files", () => {
		const result = lint(
			`export const Route = createFileRoute("/workspace/")({ component: C_Page__Workspace });`,
			"apps/web/src/routes/workspace/index.tsx",
		);

		expect(result).toHaveLength(0);
	});

	it("allows app entrypoint index files", () => {
		const result = lint(`import "./server";`, "apps/backend/src/index.ts");

		expect(result).toHaveLength(0);
	});

	it("allows package root entrypoint index files", () => {
		const result = lint(
			`export * from "./seeding.exports";`,
			"packages/seeding/src/index.ts",
		);

		expect(result).toHaveLength(0);
	});
});
