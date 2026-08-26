import type ts from "typescript";
import type { LintDiagnostic, LintRule } from "../types.ts";
import { isFileIgnored, isIgnored } from "../utils.ts";

const RULE_NAME = "sql-where-expression-naming";

const WHERE_EXPRESSION_CALLEES = new Set([
	"and",
	"arrayContained",
	"arrayContains",
	"arrayOverlaps",
	"between",
	"eq",
	"exists",
	"gt",
	"gte",
	"ilike",
	"inArray",
	"isNotNull",
	"isNull",
	"like",
	"lt",
	"lte",
	"ne",
	"not",
	"notBetween",
	"notExists",
	"notIlike",
	"notInArray",
	"notLike",
	"or",
]);

export function sqlWhereExpressionNaming(): LintRule {
	return {
		name: RULE_NAME,
		check(sourceFile, ts) {
			const filePath = sourceFile.fileName.replaceAll("\\", "/");

			if (!filePath.endsWith(".sql.ts")) return [];
			if (isFileIgnored(sourceFile, RULE_NAME)) return [];

			const diagnostics: LintDiagnostic[] = [];

			for (const statement of sourceFile.statements) {
				if (
					ts.isFunctionDeclaration(statement) &&
					statement.name &&
					isExported(statement, ts)
				) {
					checkExportedSqlWhereHelper({
						nameNode: statement.name,
						body: statement.body,
						sourceFile,
						diagnostics,
						ts,
					});
				}

				if (ts.isVariableStatement(statement) && isExported(statement, ts)) {
					for (const declaration of statement.declarationList.declarations) {
						if (!ts.isIdentifier(declaration.name)) continue;

						checkExportedSqlWhereHelper({
							nameNode: declaration.name,
							body: declaration.initializer,
							sourceFile,
							diagnostics,
							ts,
						});
					}
				}
			}

			return diagnostics;
		},
	};
}

function checkExportedSqlWhereHelper(args: {
	readonly nameNode: ts.Identifier;
	readonly body: ts.ConciseBody | ts.Expression | ts.Block | undefined;
	readonly sourceFile: ts.SourceFile;
	readonly diagnostics: LintDiagnostic[];
	readonly ts: typeof ts;
}) {
	const name = args.nameNode.text;
	const isWhereHelper =
		name.endsWith("Where") ||
		name.startsWith("SQL_Where__") ||
		returnsWhereExpression({ body: args.body, ts: args.ts });

	if (!isWhereHelper) return;
	if (/^SQL_Where__[A-Z][A-Za-z0-9]*$/.test(name)) return;
	if (isIgnored(args.sourceFile, args.nameNode, RULE_NAME)) return;

	args.diagnostics.push(
		diagnostic({
			node: args.nameNode,
			sourceFile: args.sourceFile,
			message:
				"Exported Drizzle where expression helpers in *.sql.ts must use SQL_Where__<Name> names.",
		}),
	);
}

function returnsWhereExpression(args: {
	readonly body: ts.ConciseBody | ts.Expression | ts.Block | undefined;
	readonly ts: typeof ts;
}): boolean {
	if (!args.body) return false;

	if (
		args.ts.isArrowFunction(args.body) ||
		args.ts.isFunctionExpression(args.body)
	) {
		return returnsWhereExpression({ body: args.body.body, ts: args.ts });
	}

	if (args.ts.isBlock(args.body)) {
		return args.body.statements.some(
			(statement) =>
				args.ts.isReturnStatement(statement) &&
				Boolean(
					statement.expression &&
					isWhereExpression({ expression: statement.expression, ts: args.ts }),
				),
		);
	}

	return isWhereExpression({ expression: args.body, ts: args.ts });
}

function isWhereExpression(args: {
	readonly expression: ts.Expression;
	readonly ts: typeof ts;
}): boolean {
	const expression = unwrapExpression({
		expression: args.expression,
		ts: args.ts,
	});

	if (!args.ts.isCallExpression(expression)) return false;

	const callee = expression.expression;

	return (
		args.ts.isIdentifier(callee) && WHERE_EXPRESSION_CALLEES.has(callee.text)
	);
}

function unwrapExpression(args: {
	readonly expression: ts.Expression;
	readonly ts: typeof ts;
}): ts.Expression {
	let current = args.expression;

	while (
		args.ts.isParenthesizedExpression(current) ||
		args.ts.isAsExpression(current) ||
		args.ts.isSatisfiesExpression(current)
	) {
		current = current.expression;
	}

	return current;
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
