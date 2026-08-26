import type ts from "typescript";
import type { LintRule, LintDiagnostic } from "../types.ts";
import { isIgnored } from "../utils.ts";

const RULE_NAME = "no-imperative-loops";

export function noImperativeLoops(): LintRule {
	return {
		name: RULE_NAME,
		check(sourceFile, ts) {
			const diagnostics: LintDiagnostic[] = [];

			function isInsideGenerator(node: ts.Node): boolean {
				let current = node.parent;
				while (current) {
					if (
						(ts.isFunctionDeclaration(current) ||
							ts.isFunctionExpression(current) ||
							ts.isMethodDeclaration(current)) &&
						current.asteriskToken
					) {
						return true;
					}
					current = current.parent;
				}
				return false;
			}

			function visit(node: ts.Node) {
				const isLoop =
					ts.isForStatement(node) ||
					ts.isForOfStatement(node) ||
					ts.isForInStatement(node) ||
					ts.isWhileStatement(node) ||
					ts.isDoStatement(node);

				if (isLoop && !isIgnored(sourceFile, node, RULE_NAME)) {
					// Allow for...of inside generators
					if (ts.isForOfStatement(node) && isInsideGenerator(node)) {
						ts.forEachChild(node, visit);
						return;
					}

					const keyword =
						ts.isWhileStatement(node) || ts.isDoStatement(node)
							? "while"
							: "for";
					const start = sourceFile.getLineAndCharacterOfPosition(
						node.getStart(sourceFile),
					);
					diagnostics.push({
						file: sourceFile.fileName,
						line: start.line + 1,
						column: start.character + 1,
						message: `Use .map(), .filter(), .find(), or .reduce() instead of '${keyword}' loops.`,
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
