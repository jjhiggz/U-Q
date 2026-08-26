import type ts from "typescript";
import type { LintDiagnostic, LintRule } from "../types.ts";
import { isFileIgnored, isIgnored } from "../utils.ts";

const RULE_NAME = "no-product-json-db-columns";
const JSON_FACTORIES = new Set(["json", "jsonb"]);
const APPROVED_HELPER_FILE = "/server/database/external-payload.column.ts";

export function noProductJsonDbColumns(): LintRule {
	return {
		name: RULE_NAME,
		check(sourceFile, ts) {
			const filePath = sourceFile.fileName.replaceAll("\\", "/");
			if (!isTableFile(filePath) || filePath.endsWith(APPROVED_HELPER_FILE))
				return [];
			if (isFileIgnored(sourceFile, RULE_NAME)) return [];

			const importedFactories = getImportedFactories(sourceFile, ts);
			const namespaceImports = getPgCoreNamespaces(sourceFile, ts);
			const diagnostics: LintDiagnostic[] = [];

			function visit(node: ts.Node) {
				if (
					ts.isCallExpression(node) &&
					isJsonFactoryCall(
						node.expression,
						importedFactories,
						namespaceImports,
						ts,
					) &&
					!isIgnored(sourceFile, node, RULE_NAME)
				) {
					diagnostics.push(createDiagnostic(sourceFile, node));
				}

				ts.forEachChild(node, visit);
			}

			visit(sourceFile);
			return diagnostics;
		},
	};
}

function isTableFile(filePath: string): boolean {
	return filePath.endsWith(".table.ts") || filePath.includes("/src/db/");
}

function getImportedFactories(
	sourceFile: ts.SourceFile,
	tsImpl: typeof import("typescript"),
): ReadonlySet<string> {
	return new Set(
		sourceFile.statements.flatMap((statement) => {
			if (!isPgCoreImport(statement, tsImpl)) return [];
			const bindings = statement.importClause?.namedBindings;
			if (!bindings || !tsImpl.isNamedImports(bindings)) return [];

			return bindings.elements.flatMap((element) => {
				const importedName = element.propertyName?.text ?? element.name.text;
				return JSON_FACTORIES.has(importedName) ? [element.name.text] : [];
			});
		}),
	);
}

function getPgCoreNamespaces(
	sourceFile: ts.SourceFile,
	tsImpl: typeof import("typescript"),
): ReadonlySet<string> {
	return new Set(
		sourceFile.statements.flatMap((statement) => {
			if (!isPgCoreImport(statement, tsImpl)) return [];
			const bindings = statement.importClause?.namedBindings;
			return bindings && tsImpl.isNamespaceImport(bindings)
				? [bindings.name.text]
				: [];
		}),
	);
}

function isPgCoreImport(
	statement: ts.Statement,
	tsImpl: typeof import("typescript"),
): statement is ts.ImportDeclaration {
	return (
		tsImpl.isImportDeclaration(statement) &&
		tsImpl.isStringLiteral(statement.moduleSpecifier) &&
		statement.moduleSpecifier.text === "drizzle-orm/pg-core"
	);
}

function isJsonFactoryCall(
	expression: ts.Expression,
	importedFactories: ReadonlySet<string>,
	namespaceImports: ReadonlySet<string>,
	tsImpl: typeof import("typescript"),
): boolean {
	if (tsImpl.isIdentifier(expression)) {
		return importedFactories.has(expression.text);
	}

	return (
		tsImpl.isPropertyAccessExpression(expression) &&
		tsImpl.isIdentifier(expression.expression) &&
		namespaceImports.has(expression.expression.text) &&
		JSON_FACTORIES.has(expression.name.text)
	);
}

function createDiagnostic(
	sourceFile: ts.SourceFile,
	node: ts.Node,
): LintDiagnostic {
	const position = sourceFile.getLineAndCharacterOfPosition(
		node.getStart(sourceFile),
	);
	return {
		file: sourceFile.fileName,
		line: position.line + 1,
		column: position.character + 1,
		message:
			"Model product state relationally. Direct json/jsonb columns are reserved for an approved opaque external-payload helper.",
		rule: RULE_NAME,
	};
}
