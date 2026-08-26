import type ts from "typescript";
import type { LintRule, LintDiagnostic } from "../types.ts";
import { isIgnored } from "../utils.ts";

const RULE_NAME = "no-array-mutation";

const MUTATING_METHODS = new Map([
	["push", "Use spread operator or .concat() to add elements"],
	["pop", "Use .slice(0, -1) to remove last element"],
	["shift", "Use .slice(1) to remove first element"],
	["unshift", "Use spread operator to prepend elements"],
	["splice", "Use .slice() and spread to modify arrays"],
	["reverse", "Use .toReversed() instead"],
	["sort", "Use .toSorted() instead"],
	["fill", "Use .map() to create filled array"],
	["copyWithin", "Use .slice() and spread instead"],
]);

export function noArrayMutation(): LintRule {
	return {
		name: RULE_NAME,
		check(sourceFile, ts) {
			const diagnostics: LintDiagnostic[] = [];

			function visit(node: ts.Node) {
				// Look for call expressions like arr.push(), arr.sort(), etc.
				if (
					ts.isCallExpression(node) &&
					ts.isPropertyAccessExpression(node.expression)
				) {
					const methodName = node.expression.name.getText(sourceFile);
					const suggestion = MUTATING_METHODS.get(methodName);

					if (suggestion && !isIgnored(sourceFile, node, RULE_NAME)) {
						const start = sourceFile.getLineAndCharacterOfPosition(
							node.getStart(sourceFile),
						);
						diagnostics.push({
							file: sourceFile.fileName,
							line: start.line + 1,
							column: start.character + 1,
							message: `Array mutation method '.${methodName}()' modifies in place. ${suggestion}.`,
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
