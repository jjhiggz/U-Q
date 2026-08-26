import type ts from "typescript";
import type { LintRule, LintDiagnostic } from "../types.ts";
import { isIgnored } from "../utils.ts";

const RULE_NAME = "no-long-ternary";
const DEFAULT_MAX_LINES = 3;

export function noLongTernary(maxLines = DEFAULT_MAX_LINES): LintRule {
	return {
		name: RULE_NAME,
		check(sourceFile, ts) {
			const diagnostics: LintDiagnostic[] = [];

			function visit(node: ts.Node) {
				if (ts.isConditionalExpression(node)) {
					const start = sourceFile.getLineAndCharacterOfPosition(
						node.getStart(sourceFile),
					);
					const end = sourceFile.getLineAndCharacterOfPosition(node.getEnd());
					const lineSpan = end.line - start.line + 1;

					if (lineSpan > maxLines && !isIgnored(sourceFile, node, RULE_NAME)) {
						diagnostics.push({
							file: sourceFile.fileName,
							line: start.line + 1,
							column: start.character + 1,
							message: `Ternary expression spans ${lineSpan} lines (max ${maxLines}). Use match(), an extracted component, or an early return.`,
							rule: RULE_NAME,
						});
					}
				}
				ts.forEachChild(node, visit);
			}

			visit(sourceFile);
			return diagnostics;
		},
	};
}
