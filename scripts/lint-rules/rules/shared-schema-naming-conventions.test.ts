import { describe, expect, it } from "vitest";
import ts from "typescript";
import { sharedSchemaNamingConventions } from "./shared-schema-naming-conventions.ts";

function lint(
	code: string,
	fileName = "packages/shared/src/menu-groups.schema.ts",
) {
	const sourceFile = ts.createSourceFile(
		fileName,
		code,
		ts.ScriptTarget.ESNext,
		true,
		ts.ScriptKind.TS,
	);
	return sharedSchemaNamingConventions().check(sourceFile, ts);
}

describe("shared-schema-naming-conventions", () => {
	it("requires exported shared schemas to use S prefixed double-underscore names", () => {
		const result = lint(`export const SMenuEditCommand = z.object({});`);

		expect(result).toHaveLength(1);
		expect(result[0].message).toContain("S__<Name>");
	});

	it("allows exported shared schema names with roles", () => {
		const result = lint(`
      export const S__MenuEditCommand = z.object({});
      export const S_Row__MenuGroup = z.object({});
      export const S_In_D__saveMenuGroupDraftEditCommands = z.object({});
    `);

		expect(result).toHaveLength(0);
	});

	it("requires exported shared schema types to use I prefixed double-underscore names", () => {
		const result = lint(
			`export type IMenuEditCommand = z.infer<typeof S__MenuEditCommand>;`,
		);

		expect(result).toHaveLength(1);
		expect(result[0].message).toContain("I__<Name>");
	});

	it("allows exported shared schema type names with roles", () => {
		const result = lint(`
      export type I__MenuEditCommand = z.infer<typeof S__MenuEditCommand>;
      export type I_Row__MenuGroup = z.infer<typeof S_Row__MenuGroup>;
      export type I_Out_D__saveMenuGroupDraftEditCommands = z.infer<
        typeof S_Out_D__saveMenuGroupDraftEditCommands
      >;
    `);

		expect(result).toHaveLength(0);
	});

	it("ignores non-shared schema files", () => {
		const result = lint(
			`export const SMenuEditCommand = z.object({});`,
			"apps/web/src/features/example.ts",
		);

		expect(result).toHaveLength(0);
	});
});
