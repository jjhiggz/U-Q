import type ts from "typescript";
import type { LintRule, LintDiagnostic } from "../types.ts";
import { isIgnored, isFileIgnored } from "../utils.ts";

const RULE_NAME = "no-as-cast";

export function noAsCast(): LintRule {
	return {
		name: RULE_NAME,
		check(sourceFile, ts) {
			// Check file-level ignore
			if (isFileIgnored(sourceFile, RULE_NAME)) return [];

			const diagnostics: LintDiagnostic[] = [];

			function getContainingStatement(node: ts.Node): ts.Node {
				let current: ts.Node = node;
				while (current.parent && !ts.isSourceFile(current.parent)) {
					if (ts.isStatement(current)) {
						return current;
					}
					current = current.parent;
				}
				return current;
			}

			function isIgnoredCast(node: ts.Node): boolean {
				return (
					isIgnored(sourceFile, node, RULE_NAME) ||
					isIgnored(sourceFile, getContainingStatement(node), RULE_NAME)
				);
			}

			function visit(node: ts.Node) {
				if (ts.isAsExpression(node)) {
					const typeNode = node.type;
					const typeText = typeNode.getText(sourceFile);

					const isConst = typeText === "const";
					if (!isConst && !isIgnoredCast(node)) {
						const start = sourceFile.getLineAndCharacterOfPosition(
							node.type.getStart(sourceFile),
						);
						diagnostics.push({
							file: sourceFile.fileName,
							line: start.line + 1,
							column: start.character + 1,
							message: `Avoid type assertion with 'as ${typeText}'. Use a type guard, schema parse, or fix the types.`,
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
