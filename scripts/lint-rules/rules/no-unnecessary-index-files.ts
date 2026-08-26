import type { LintDiagnostic, LintRule } from "../types.ts";
import { isFileIgnored } from "../utils.ts";

const RULE_NAME = "no-unnecessary-index-files";

export function noUnnecessaryIndexFiles(): LintRule {
	return {
		name: RULE_NAME,
		check(sourceFile) {
			const filePath = sourceFile.fileName.replaceAll("\\", "/");

			if (!isIndexFile(filePath)) return [];
			if (isAllowedRouteIndex(filePath)) return [];
			if (isAllowedEntryPoint(filePath)) return [];
			if (isFileIgnored(sourceFile, RULE_NAME)) return [];

			return [
				{
					file: sourceFile.fileName,
					line: 1,
					column: 1,
					message:
						"Avoid index.ts/index.tsx barrel files. Use an explicit role suffix like *.exports.ts or *.registry.ts unless this is a route index or package/app entrypoint.",
					rule: RULE_NAME,
				} satisfies LintDiagnostic,
			];
		},
	};
}

function isIndexFile(filePath: string): boolean {
	return /(^|\/)index\.tsx?$/.test(filePath);
}

function isAllowedRouteIndex(filePath: string): boolean {
	return /(^|\/)src\/routes(?:\/.*)?\/index\.tsx?$/.test(filePath);
}

function isAllowedEntryPoint(filePath: string): boolean {
	return /(^|\/)src\/index\.tsx?$/.test(filePath);
}
