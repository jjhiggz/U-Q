import type ts from "typescript";
import type { LintDiagnostic, LintRule } from "../types.ts";
import { isFileIgnored, isIgnored } from "../utils.ts";

const RULE_NAME = "no-cross-feature-internal-imports";

export function noCrossFeatureInternalImports(): LintRule {
	return {
		name: RULE_NAME,
		check(sourceFile, ts) {
			const filePath = sourceFile.fileName;
			const currentFeature = getCurrentFeature(filePath);

			if (!currentFeature) return [];
			if (isFileIgnored(sourceFile, RULE_NAME)) return [];

			const sourceFeature = currentFeature;
			const diagnostics: LintDiagnostic[] = [];

			function visit(node: ts.Node) {
				if (
					ts.isImportDeclaration(node) &&
					ts.isStringLiteral(node.moduleSpecifier) &&
					isCrossFeatureImport({
						currentFeature: sourceFeature,
						modulePath: node.moduleSpecifier.text,
					}) &&
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
							"Feature internals should not import another feature. Promote shared code to components/shared, lib, server-state, or mock-data.",
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

function getCurrentFeature(filePath: string): string | null {
	const match = filePath.match(/\/src\/features\/([^/]+)\//);
	return match?.[1] ?? null;
}

function isCrossFeatureImport(args: {
	readonly currentFeature: string;
	readonly modulePath: string;
}): boolean {
	const match = args.modulePath.match(/^@\/features\/([^/]+)\//);
	if (!match) return false;

	return match[1] !== args.currentFeature;
}
