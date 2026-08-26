import type ts from "typescript";
import type { LintDiagnostic, LintRule } from "../types.ts";
import { isFileIgnored, isIgnored } from "../utils.ts";

const RULE_NAME = "no-try-catch";
const TRY_RESULT_HELPER_PATH = "src/lib/try-result.ts";
const EMBEDDED_TRY_CATCH_PATTERN = /\btry\s*\{[\s\S]*\bcatch\b/;

function isTryResultHelper(sourceFile: ts.SourceFile): boolean {
	return sourceFile.fileName
		.replaceAll("\\", "/")
		.endsWith(TRY_RESULT_HELPER_PATH);
}

function isEmbeddedTryCatchText(
	node: ts.Node,
	ts: typeof import("typescript"),
): boolean {
	return (
		(ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) &&
		EMBEDDED_TRY_CATCH_PATTERN.test(node.text)
	);
}

export function noTryCatch(): LintRule {
	return {
		name: RULE_NAME,
		check(sourceFile, ts) {
			if (isFileIgnored(sourceFile, RULE_NAME) || isTryResultHelper(sourceFile))
				return [];

			const diagnostics: LintDiagnostic[] = [];

			function visit(node: ts.Node) {
				if (
					ts.isTryStatement(node) &&
					!isIgnored(sourceFile, node, RULE_NAME)
				) {
					const start = sourceFile.getLineAndCharacterOfPosition(
						node.getStart(sourceFile),
					);
					diagnostics.push({
						file: sourceFile.fileName,
						line: start.line + 1,
						column: start.character + 1,
						message:
							"Avoid try/catch. Use trySync/tryAsync for boundary-style code; inside Effect code prefer Effect.try, Effect.tryPromise, catchAll, or catchTag so errors stay in the Effect channel.",
						rule: RULE_NAME,
					});
				}

				if (
					isEmbeddedTryCatchText(node, ts) &&
					!isIgnored(sourceFile, node, RULE_NAME)
				) {
					const start = sourceFile.getLineAndCharacterOfPosition(
						node.getStart(sourceFile),
					);
					diagnostics.push({
						file: sourceFile.fileName,
						line: start.line + 1,
						column: start.character + 1,
						message:
							"Avoid embedded try/catch in strings or inline scripts. Keep fallible boundary code behind trySync/tryAsync, or use Effect error handling inside Effect code.",
						rule: RULE_NAME,
					});
				}

				ts.forEachChild(node, visit);
			}

			visit(sourceFile);
			return diagnostics;
		},
	};
}
