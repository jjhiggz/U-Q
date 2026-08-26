import type ts from "typescript";
import type { LintRule, LintDiagnostic } from "../types.ts";
import { isFileIgnored, isIgnored } from "../utils.ts";

const RULE_NAME = "no-switch-statement";

export function noSwitchStatement(): LintRule {
	return {
		name: RULE_NAME,
		check(sourceFile, ts) {
			if (isFileIgnored(sourceFile, RULE_NAME)) return [];

			const diagnostics: LintDiagnostic[] = [];

			function visit(node: ts.Node) {
				if (
					ts.isSwitchStatement(node) &&
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
							"Avoid switch/case statements. Use ts-pattern match(), Effect Match, or typed lookup objects instead.",
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
