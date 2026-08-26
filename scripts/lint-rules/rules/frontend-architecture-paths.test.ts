import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import ts from "typescript";
import { frontendArchitecturePaths } from "./frontend-architecture-paths.ts";

function lint(code: string, fileName: string) {
	const sourceFile = ts.createSourceFile(
		fileName,
		code,
		ts.ScriptTarget.ESNext,
		true,
		ts.ScriptKind.TSX,
	);
	return frontendArchitecturePaths().check(sourceFile, ts);
}

function createTempFeature() {
	const root = mkdtempSync(join(tmpdir(), "lint-rules-"));
	const featureDir = join(root, "apps/web/src/features/demo");
	mkdirSync(featureDir, { recursive: true });
	writeFileSync(join(featureDir, "FEATURE.md"), "# Demo\n");
	return featureDir;
}

describe("frontend-architecture-paths", () => {
	it("requires page files to export C_Page__ components", () => {
		const featureDir = createTempFeature();
		const result = lint(
			`export function C_Demo() { return null; }`,
			join(featureDir, "demo.page.tsx"),
		);

		expect(result).toHaveLength(1);
		expect(result[0].message).toContain("C_Page__");
	});

	it("allows page files that export C_Page__ components", () => {
		const featureDir = createTempFeature();
		const result = lint(
			`export function C_Page__Demo() { return null; }`,
			join(featureDir, "demo.page.tsx"),
		);

		expect(result).toHaveLength(0);
	});

	it("requires layout files to export C_Layout__ components", () => {
		const featureDir = createTempFeature();
		const result = lint(
			`export function C_Page__Demo() { return null; }`,
			join(featureDir, "demo.layout.tsx"),
		);

		expect(result).toHaveLength(1);
		expect(result[0].message).toContain("C_Layout__");
	});

	it("requires FEATURE.md in feature folders", () => {
		const root = mkdtempSync(join(tmpdir(), "lint-rules-"));
		const featureDir = join(root, "apps/web/src/features/demo");
		mkdirSync(featureDir, { recursive: true });

		const result = lint(
			`export function C_Page__Demo() { return null; }`,
			join(featureDir, "demo.page.tsx"),
		);

		expect(result).toHaveLength(1);
		expect(result[0].message).toContain("FEATURE.md");
	});
});
