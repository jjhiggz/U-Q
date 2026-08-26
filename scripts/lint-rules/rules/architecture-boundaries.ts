import type ts from "typescript";
import type { LintDiagnostic, LintRule } from "../types.ts";
import { isFileIgnored, isIgnored } from "../utils.ts";

const RULE_NAME = "architecture-boundaries";

export function architectureBoundaries(): LintRule {
	return {
		name: RULE_NAME,
		check(sourceFile, ts) {
			if (isFileIgnored(sourceFile, RULE_NAME)) return [];

			const filePath = sourceFile.fileName.replaceAll("\\", "/");
			const diagnostics: LintDiagnostic[] = [];

			for (const statement of sourceFile.statements) {
				if (
					!ts.isImportDeclaration(statement) ||
					!ts.isStringLiteral(statement.moduleSpecifier) ||
					isIgnored(sourceFile, statement, RULE_NAME)
				) {
					continue;
				}

				const moduleName = statement.moduleSpecifier.text;
				const importedNames = getImportedNames(statement, ts);

				if (
					moduleName === "@tanstack/react-start" &&
					importedNames.includes("createServerFn") &&
					!filePath.endsWith(".functions.ts")
				) {
					diagnostics.push(
						diagnostic({
							sourceFile,
							node: statement,
							message:
								"Keep createServerFn in feature-owned *.functions.ts files and alias it as SF.",
						}),
					);
				}

				const isRepository = filePath.endsWith(".repository.ts");
				const isDatabaseInfrastructure = filePath.includes("/server/database/");
				const isAuthInfrastructure = filePath.includes("/server/auth/");
				const importsDatabaseDriver =
					moduleName === "@/db" ||
					moduleName === "drizzle-orm/node-postgres" ||
					moduleName === "pg";

				if (
					importsDatabaseDriver &&
					!isRepository &&
					!isDatabaseInfrastructure &&
					!isAuthInfrastructure
				) {
					diagnostics.push(
						diagnostic({
							sourceFile,
							node: statement,
							message:
								"Access Drizzle and the database driver through a repository or database infrastructure.",
						}),
					);
				}
			}

			return diagnostics;
		},
	};
}

function getImportedNames(
	declaration: ts.ImportDeclaration,
	tsImpl: typeof import("typescript"),
): readonly string[] {
	const bindings = declaration.importClause?.namedBindings;
	if (!bindings || !tsImpl.isNamedImports(bindings)) return [];

	return bindings.elements.map(
		(element) => element.propertyName?.text ?? element.name.text,
	);
}

function diagnostic(args: {
	readonly sourceFile: ts.SourceFile;
	readonly node: ts.Node;
	readonly message: string;
}): LintDiagnostic {
	const position = args.sourceFile.getLineAndCharacterOfPosition(
		args.node.getStart(args.sourceFile),
	);

	return {
		file: args.sourceFile.fileName,
		line: position.line + 1,
		column: position.character + 1,
		message: args.message,
		rule: RULE_NAME,
	};
}
