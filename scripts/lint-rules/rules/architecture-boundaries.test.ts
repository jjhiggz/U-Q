import { describe, expect, it } from "vitest";
import ts from "typescript";
import { architectureBoundaries } from "./architecture-boundaries.ts";

function lint(code: string, fileName: string) {
	const sourceFile = ts.createSourceFile(
		fileName,
		code,
		ts.ScriptTarget.ESNext,
		true,
		ts.ScriptKind.TS,
	);
	return architectureBoundaries().check(sourceFile, ts);
}

describe("architecture-boundaries", () => {
	it("confines createServerFn to functions files", () => {
		expect(
			lint(
				`import { createServerFn } from "@tanstack/react-start";`,
				"/repo/src/features/songs/songs.service.ts",
			),
		).toHaveLength(1);
	});

	it("allows createServerFn in functions files", () => {
		expect(
			lint(
				`import { createServerFn } from "@tanstack/react-start";`,
				"/repo/src/features/songs/songs.functions.ts",
			),
		).toHaveLength(0);
	});

	it("confines database drivers to repositories and infrastructure", () => {
		expect(
			lint(
				`import { Pool } from "pg";`,
				"/repo/src/features/songs/songs.service.ts",
			),
		).toHaveLength(1);
	});
});
