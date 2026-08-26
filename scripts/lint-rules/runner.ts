import ts from "typescript";
import { glob, readFile } from "node:fs/promises";
import { relative, resolve } from "node:path";
import type { LintRule, LintDiagnostic } from "./types.ts";

export async function runLint(
	patterns: string[],
	rules: LintRule[],
): Promise<LintDiagnostic[]> {
	const files: string[] = [];
	for (const pattern of patterns) {
		for await (const match of glob(pattern)) {
			files.push(resolve(match));
		}
	}

	const diagnostics: LintDiagnostic[] = [];

	for (const filePath of files) {
		const sourceText = await readFile(filePath, "utf8");
		const sourceFile = ts.createSourceFile(
			filePath,
			sourceText,
			ts.ScriptTarget.ESNext,
			true,
			getScriptKind(filePath),
		);

		for (const rule of rules) {
			diagnostics.push(...rule.check(sourceFile, ts));
		}
	}

	return diagnostics;
}

function getScriptKind(filePath: string): ts.ScriptKind {
	if (filePath.endsWith(".tsx")) return ts.ScriptKind.TSX;
	return ts.ScriptKind.TS;
}

export function formatDiagnostics(diagnostics: LintDiagnostic[]): string {
	if (diagnostics.length === 0) return "";

	return diagnostics
		.map(
			(d) =>
				`${relative(process.cwd(), d.file)}:${d.line}:${d.column} [${d.rule}] ${d.message}`,
		)
		.join("\n");
}
