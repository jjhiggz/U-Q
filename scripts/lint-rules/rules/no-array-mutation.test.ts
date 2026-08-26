import { describe, expect, it } from "vitest";
import ts from "typescript";
import { noArrayMutation } from "./no-array-mutation.ts";

function lint(code: string) {
	const sourceFile = ts.createSourceFile(
		"/repo/src/example.ts",
		code,
		ts.ScriptTarget.ESNext,
		true,
		ts.ScriptKind.TS,
	);
	return noArrayMutation().check(sourceFile, ts);
}

describe("no-array-mutation", () => {
	it.each([
		"push",
		"pop",
		"shift",
		"unshift",
		"splice",
		"reverse",
		"sort",
		"fill",
		"copyWithin",
	])("flags .%s()", (method) => {
		expect(lint(`items.${method}();`)).toHaveLength(1);
	});

	it("allows immutable array methods", () => {
		expect(lint(`items.map(String); items.toSorted();`)).toHaveLength(0);
	});
});
