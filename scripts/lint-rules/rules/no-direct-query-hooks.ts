import type ts from "typescript";
import type { LintRule, LintDiagnostic } from "../types.ts";
import { isIgnored, isFileIgnored } from "../utils.ts";

const RULE_NAME = "no-direct-query-hooks";
const FLAGGED_HOOKS = ["useQuery", "useMutation", "useQueryClient"];

export function noDirectQueryHooks(): LintRule {
	return {
		name: RULE_NAME,
		check(sourceFile, ts) {
			const filePath = sourceFile.fileName;

			// Only check files in components/, features/, or routes/
			const isTargetFile =
				filePath.includes("components/") ||
				filePath.includes("features/") ||
				filePath.includes("routes/");
			const isQueryFile =
				filePath.endsWith(".queries.ts") ||
				filePath.endsWith("/lib/server-state.ts");

			if (!isTargetFile || isQueryFile) return [];

			// Check file-level ignore
			if (isFileIgnored(sourceFile, RULE_NAME)) return [];

			const diagnostics: LintDiagnostic[] = [];

			function visit(node: ts.Node) {
				if (
					ts.isCallExpression(node) &&
					ts.isIdentifier(node.expression) &&
					FLAGGED_HOOKS.includes(node.expression.text)
				) {
					if (!isIgnored(sourceFile, node, RULE_NAME)) {
						const start = sourceFile.getLineAndCharacterOfPosition(
							node.getStart(sourceFile),
						);
						diagnostics.push({
							file: sourceFile.fileName,
							line: start.line + 1,
							column: start.character + 1,
							message:
								"Use QO__* query options or feature-owned mutation hooks from a colocated *.queries.ts file.",
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
