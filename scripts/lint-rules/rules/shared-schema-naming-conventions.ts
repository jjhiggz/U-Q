import type ts from "typescript";
import type { LintDiagnostic, LintRule } from "../types.ts";
import { isFileIgnored, isIgnored } from "../utils.ts";

const RULE_NAME = "shared-schema-naming-conventions";

export function sharedSchemaNamingConventions(): LintRule {
	return {
		name: RULE_NAME,
		check(sourceFile, ts) {
			const filePath = sourceFile.fileName.replaceAll("\\", "/");

			if (!isSharedSchemaFile(filePath)) return [];
			if (isFileIgnored(sourceFile, RULE_NAME)) return [];

			const diagnostics: LintDiagnostic[] = [];

			for (const statement of sourceFile.statements) {
				if (ts.isVariableStatement(statement) && isExported(statement, ts)) {
					diagnostics.push(
						...checkExportedVariable({ statement, sourceFile, ts }),
					);
				}

				if (
					(ts.isInterfaceDeclaration(statement) ||
						ts.isTypeAliasDeclaration(statement)) &&
					isExported(statement, ts)
				) {
					diagnostics.push(...checkExportedType({ statement, sourceFile }));
				}
			}

			return diagnostics;
		},
	};
}

function isSharedSchemaFile(filePath: string): boolean {
	return filePath.includes("/src/") && filePath.endsWith(".schema.ts");
}

function checkExportedVariable(args: {
	readonly statement: ts.VariableStatement;
	readonly sourceFile: ts.SourceFile;
	readonly ts: typeof ts;
}): LintDiagnostic[] {
	return args.statement.declarationList.declarations.flatMap((declaration) => {
		if (!args.ts.isIdentifier(declaration.name)) return [];

		const name = declaration.name.text;

		if (!isZodSchemaExpression(declaration.initializer, args.ts)) return [];
		if (isValidPrefixedName(name, "S")) return [];
		if (isIgnored(args.sourceFile, declaration.name, RULE_NAME)) return [];

		return [
			diagnostic({
				node: declaration.name,
				sourceFile: args.sourceFile,
				message:
					"Exported Zod schemas must use S__<Name> or S_<Role>__<Name> names.",
			}),
		];
	});
}

function checkExportedType(args: {
	readonly statement: ts.InterfaceDeclaration | ts.TypeAliasDeclaration;
	readonly sourceFile: ts.SourceFile;
}): LintDiagnostic[] {
	const name = args.statement.name.text;

	if (!isZodInferredType(args.statement)) return [];
	if (isValidPrefixedName(name, "I")) return [];
	if (isIgnored(args.sourceFile, args.statement.name, RULE_NAME)) return [];

	return [
		diagnostic({
			node: args.statement.name,
			sourceFile: args.sourceFile,
			message:
				"Exported Zod-inferred types must use I__<Name> or I_<Role>__<Name> names.",
		}),
	];
}

function isZodSchemaExpression(
	expression: ts.Expression | undefined,
	tsImpl: typeof import("typescript"),
): boolean {
	if (!expression) return false;

	if (tsImpl.isIdentifier(expression)) {
		return expression.text.startsWith("S_");
	}

	if (tsImpl.isCallExpression(expression)) {
		return isZodSchemaExpression(expression.expression, tsImpl);
	}

	if (tsImpl.isPropertyAccessExpression(expression)) {
		return (
			(tsImpl.isIdentifier(expression.expression) &&
				expression.expression.text === "z") ||
			isZodSchemaExpression(expression.expression, tsImpl)
		);
	}

	return false;
}

function isZodInferredType(
	statement: ts.InterfaceDeclaration | ts.TypeAliasDeclaration,
): boolean {
	return statement.getText().includes("z.infer<");
}

function isValidPrefixedName(name: string, kind: "I" | "S"): boolean {
	return new RegExp(`^${kind}(?:_[A-Za-z0-9]+)*__[A-Za-z0-9]`).test(name);
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
