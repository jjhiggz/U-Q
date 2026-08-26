import { describe, it, expect } from "vitest";
import ts from "typescript";
import { noTypePredicate } from "./no-type-predicate.ts";

function lint(code: string) {
	const sourceFile = ts.createSourceFile(
		"test.ts",
		code,
		ts.ScriptTarget.ESNext,
		true,
		ts.ScriptKind.TS,
	);
	return noTypePredicate().check(sourceFile, ts);
}

describe("no-type-predicate", () => {
	it("flags function return type predicates", () => {
		const result = lint(
			`function isUser(value: unknown): value is User { return true; }`,
		);
		expect(result).toHaveLength(1);
		expect(result[0].rule).toBe("no-type-predicate");
	});

	it("flags inline filter type predicates", () => {
		const result = lint(
			`items.filter((item): item is NonNullable<typeof item> => item !== null);`,
		);
		expect(result).toHaveLength(1);
	});

	it("flags function type predicates", () => {
		const result = lint(`type Refine = (value: unknown) => value is string;`);
		expect(result).toHaveLength(1);
	});

	it("allows ordinary boolean predicates", () => {
		expect(
			lint(`const keep = (value: unknown): boolean => value !== null;`),
		).toHaveLength(0);
	});

	it("allows with lint-ignore comment", () => {
		const code = `// lint-ignore: no-type-predicate\nfunction isUser(value: unknown): value is User { return true; }`;
		expect(lint(code)).toHaveLength(0);
	});
});
