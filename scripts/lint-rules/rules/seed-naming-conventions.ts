import type ts from "typescript";
import type { LintDiagnostic, LintRule } from "../types.ts";
import { isFileIgnored } from "../utils.ts";

const RULE_NAME = "seed-naming-conventions";

export function seedNamingConventions(): LintRule {
	return {
		name: RULE_NAME,
		check(sourceFile, ts) {
			const filePath = sourceFile.fileName.replaceAll("\\", "/");

			if (!isSeedFile(filePath)) return [];
			if (isFileIgnored(sourceFile, RULE_NAME)) return [];

			const diagnostics: LintDiagnostic[] = [];

			for (const statement of sourceFile.statements) {
				if (ts.isVariableStatement(statement) && isExported(statement, ts)) {
					diagnostics.push(
						...checkExportedVariable({ statement, sourceFile, filePath, ts }),
					);
				}

				if (
					(ts.isInterfaceDeclaration(statement) ||
						ts.isTypeAliasDeclaration(statement)) &&
					isExported(statement, ts)
				) {
					diagnostics.push(
						...checkExportedType({ statement, sourceFile, filePath }),
					);
				}
			}

			return diagnostics;
		},
	};
}

function isSeedFile(filePath: string): boolean {
	return (
		filePath.includes("/devtools/seeding/") ||
		filePath.includes("/packages/seeding/src/")
	);
}

function checkExportedVariable(args: {
	readonly statement: ts.VariableStatement;
	readonly sourceFile: ts.SourceFile;
	readonly filePath: string;
	readonly ts: typeof ts;
}): LintDiagnostic[] {
	return args.statement.declarationList.declarations.flatMap((declaration) => {
		if (!args.ts.isIdentifier(declaration.name)) return [];

		const name = declaration.name.text;

		if (args.filePath.endsWith(".factory.ts") && name.startsWith("F_")) {
			return /^F_Seed__[A-Z]/.test(name)
				? []
				: [
						diagnostic({
							node: declaration.name,
							sourceFile: args.sourceFile,
							message:
								"Exported seed factory functions must use F_Seed__<Resource> names.",
						}),
					];
		}

		if (
			args.filePath.endsWith("/scenarios.registry.ts") &&
			name.toLowerCase().includes("scenario")
		) {
			return /^SCN_Registry__Seed[A-Z]/.test(name)
				? []
				: [
						diagnostic({
							node: declaration.name,
							sourceFile: args.sourceFile,
							message:
								"Exported seed scenario registries must use SCN_Registry__Seed<Resource> names.",
						}),
					];
		}

		if (
			args.filePath.includes("/scenarios/") &&
			!args.filePath.endsWith("/scenarios.registry.ts") &&
			isScenarioInstance(declaration, args.ts)
		) {
			return name.startsWith("SCN__")
				? []
				: [
						diagnostic({
							node: declaration.name,
							sourceFile: args.sourceFile,
							message:
								"Exported seed scenario instances must use SCN__<name> names.",
						}),
					];
		}

		return [];
	});
}

function checkExportedType(args: {
	readonly statement: ts.InterfaceDeclaration | ts.TypeAliasDeclaration;
	readonly sourceFile: ts.SourceFile;
	readonly filePath: string;
}): LintDiagnostic[] {
	const name = args.statement.name.text;

	if (!args.filePath.includes("/seeding/")) return [];
	if (!name.includes("Seed")) return [];
	if (/^I_(?:Opts|Out)_Seed__[A-Z]/.test(name)) return [];
	if (name === "I_Out_Seed__OfScenario") return [];

	return [
		diagnostic({
			node: args.statement.name,
			sourceFile: args.sourceFile,
			message:
				"Exported seed option/output types must use I_Opts_Seed__<Resource> or I_Out_Seed__<Resource> names.",
		}),
	];
}

function isScenarioInstance(
	declaration: ts.VariableDeclaration,
	ts: typeof import("typescript"),
) {
	const initializer = declaration.initializer;
	return Boolean(
		initializer &&
		ts.isNewExpression(initializer) &&
		ts.isIdentifier(initializer.expression) &&
		initializer.expression.text.endsWith("Scenario"),
	);
}

function isExported(node: ts.Node, ts: typeof import("typescript")): boolean {
	return (
		ts.canHaveModifiers(node) &&
		Boolean(
			ts
				.getModifiers(node)
				?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword),
		)
	);
}

function diagnostic(args: {
	readonly node: ts.Node;
	readonly sourceFile: ts.SourceFile;
	readonly message: string;
}): LintDiagnostic {
	const start = args.sourceFile.getLineAndCharacterOfPosition(
		args.node.getStart(args.sourceFile),
	);
	return {
		file: args.sourceFile.fileName,
		line: start.line + 1,
		column: start.character + 1,
		message: args.message,
		rule: RULE_NAME,
	};
}
