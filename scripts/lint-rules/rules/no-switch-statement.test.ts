import { describe, it, expect } from "vitest";
import ts from "typescript";
import { noSwitchStatement } from "./no-switch-statement.ts";

function lint(code: string) {
	const sourceFile = ts.createSourceFile(
		"test.ts",
		code,
		ts.ScriptTarget.ESNext,
		true,
		ts.ScriptKind.TS,
	);
	return noSwitchStatement().check(sourceFile, ts);
}

describe("no-switch-statement", () => {
	it("flags switch statements", () => {
		const result = lint(
			`switch (value) { case "a": return 1; default: return 2; }`,
		);
		expect(result).toHaveLength(1);
		expect(result[0].rule).toBe("no-switch-statement");
		expect(result[0].message).toContain("ts-pattern");
	});

	it("allows lookup objects", () => {
		expect(lint(`const label = labels[value] ?? "Unknown";`)).toHaveLength(0);
	});

	it("allows with lint-ignore comment", () => {
		const code = `// lint-ignore: no-switch-statement\nswitch (value) { default: return value; }`;
		expect(lint(code)).toHaveLength(0);
	});

	it("allows with file-level lint-ignore comment", () => {
		const code = `// lint-ignore-file: no-switch-statement\nswitch (value) { default: return value; }`;
		expect(lint(code)).toHaveLength(0);
	});
});
