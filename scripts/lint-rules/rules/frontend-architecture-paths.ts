import { existsSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import type ts from "typescript";
import type { LintDiagnostic, LintRule } from "../types.ts";
import { isFileIgnored } from "../utils.ts";

const RULE_NAME = "frontend-architecture-paths";

export function frontendArchitecturePaths(): LintRule {
	const reportedMissingFeatureDocs = new Set<string>();

	return {
		name: RULE_NAME,
		check(sourceFile, ts) {
			if (isFileIgnored(sourceFile, RULE_NAME)) return [];

			const diagnostics: LintDiagnostic[] = [];
			const filePath = sourceFile.fileName;

			checkFeatureFile({
				filePath,
				diagnostics,
				reportedMissingFeatureDocs,
				sourceFile,
				ts,
			});

			return diagnostics;
		},
	};
}

function checkFeatureFile(args: {
	readonly filePath: string;
	readonly diagnostics: LintDiagnostic[];
	readonly reportedMissingFeatureDocs: Set<string>;
	readonly sourceFile: ts.SourceFile;
	readonly ts: typeof ts;
}) {
	const featureDir = getFeatureDir(args.filePath);
	if (!featureDir) return;

	const featureDocPath = join(featureDir, "FEATURE.md");
	if (
		!existsSync(featureDocPath) &&
		!args.reportedMissingFeatureDocs.has(featureDir)
	) {
		args.reportedMissingFeatureDocs.add(featureDir);
		pushDiagnostic({
			diagnostics: args.diagnostics,
			sourceFile: args.sourceFile,
			message: "Every feature folder must include FEATURE.md.",
		});
	}

	const fileName = basename(args.filePath);
	if (fileName.endsWith(".page.tsx") || fileName.endsWith(".page.ts")) {
		checkExportedEntryComponent({
			expectedPrefix: "C_Page__",
			sourceFile: args.sourceFile,
			ts: args.ts,
			diagnostics: args.diagnostics,
		});
	}

	if (fileName.endsWith(".layout.tsx") || fileName.endsWith(".layout.ts")) {
		checkExportedEntryComponent({
			expectedPrefix: "C_Layout__",
			sourceFile: args.sourceFile,
			ts: args.ts,
			diagnostics: args.diagnostics,
		});
	}
}

function getFeatureDir(filePath: string): string | null {
	const match = filePath.match(/^(.*\/src\/features\/[^/]+)/);
	if (!match) return null;

	return dirname(join(match[1], "FEATURE.md"));
}

function checkExportedEntryComponent(args: {
	readonly expectedPrefix: "C_Page__" | "C_Layout__";
	readonly sourceFile: ts.SourceFile;
	readonly ts: typeof ts;
	readonly diagnostics: LintDiagnostic[];
}) {
	if (hasExportedComponentWithPrefix(args)) return;

	pushDiagnostic({
		diagnostics: args.diagnostics,
		sourceFile: args.sourceFile,
		message: `${basename(args.sourceFile.fileName)} must export a ${args.expectedPrefix}* component.`,
	});
}

function hasExportedComponentWithPrefix(args: {
	readonly expectedPrefix: "C_Page__" | "C_Layout__";
	readonly sourceFile: ts.SourceFile;
	readonly ts: typeof ts;
}): boolean {
	return args.sourceFile.statements.some((statement) => {
		const modifiers = args.ts.canHaveModifiers(statement)
			? args.ts.getModifiers(statement)
			: undefined;
		const isExported = modifiers?.some(
			(modifier) => modifier.kind === args.ts.SyntaxKind.ExportKeyword,
		);

		if (!isExported) return false;

		if (args.ts.isFunctionDeclaration(statement)) {
			return statement.name?.text.startsWith(args.expectedPrefix) ?? false;
		}

		if (args.ts.isVariableStatement(statement)) {
			return statement.declarationList.declarations.some((declaration) => {
				return (
					args.ts.isIdentifier(declaration.name) &&
					declaration.name.text.startsWith(args.expectedPrefix)
				);
			});
		}

		return false;
	});
}

function pushDiagnostic(args: {
	readonly diagnostics: LintDiagnostic[];
	readonly sourceFile: ts.SourceFile;
	readonly message: string;
}) {
	args.diagnostics.push({
		file: args.sourceFile.fileName,
		line: 1,
		column: 1,
		message: args.message,
		rule: RULE_NAME,
	});
}
