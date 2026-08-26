import type ts from "typescript";
import type { LintDiagnostic, LintRule } from "../types.ts";
import { isFileIgnored, isIgnored } from "../utils.ts";

const RULE_NAME = "no-ui-imports-in-routes-or-pages";

export function noUiImportsInRoutesOrPages(): LintRule {
	return {
		name: RULE_NAME,
		check(sourceFile, ts) {
			const filePath = sourceFile.fileName;
			const isRouteFile = filePath.includes("/routes/");
			const isPageFile =
				filePath.endsWith(".page.tsx") || filePath.endsWith(".page.ts");

			if (!isRouteFile && !isPageFile) return [];
			if (isFileIgnored(sourceFile, RULE_NAME)) return [];

			const diagnostics: LintDiagnostic[] = [];

			function visit(node: ts.Node) {
				if (
					ts.isImportDeclaration(node) &&
					ts.isStringLiteral(node.moduleSpecifier) &&
					isUiImport(node.moduleSpecifier.text) &&
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
							"Routes and *.page files should import feature/shared components, not ~/components/ui directly.",
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

function isUiImport(modulePath: string): boolean {
	return (
		modulePath === "@/components/ui" ||
		modulePath.startsWith("@/components/ui/")
	);
}
