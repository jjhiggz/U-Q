import type ts from "typescript";
import type { LintDiagnostic, LintRule } from "../types.ts";
import { isFileIgnored, isIgnored } from "../utils.ts";

const RULE_NAME = "no-jsx-in-routes";

export function noJsxInRoutes(): LintRule {
	return {
		name: RULE_NAME,
		check(sourceFile, ts) {
			const filePath = sourceFile.fileName;

			if (!filePath.includes("/src/routes/")) return [];
			if (filePath.endsWith("/__root.tsx") || filePath.endsWith("/__root.ts"))
				return [];
			if (isFileIgnored(sourceFile, RULE_NAME)) return [];

			const diagnostics: LintDiagnostic[] = [];

			function visit(node: ts.Node) {
				if (
					isJsxNode({ node, ts }) &&
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
							"Non-root routes should not contain JSX. Render a C_Page__* or C_Layout__* feature entry instead.",
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

function isJsxNode(args: {
	readonly node: ts.Node;
	readonly ts: typeof ts;
}): boolean {
	return (
		args.ts.isJsxElement(args.node) ||
		args.ts.isJsxSelfClosingElement(args.node) ||
		args.ts.isJsxFragment(args.node)
	);
}
