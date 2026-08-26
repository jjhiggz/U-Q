import type ts from "typescript";
import type { LintDiagnostic, LintRule } from "../types.ts";
import { isFileIgnored, isIgnored } from "../utils.ts";

const RULE_NAME = "no-trivial-proxy-function";

type FunctionLikeWithBody =
	| ts.FunctionDeclaration
	| ts.FunctionExpression
	| ts.ArrowFunction
	| ts.MethodDeclaration;

function getFunctionName(
	node: FunctionLikeWithBody,
	sourceFile: ts.SourceFile,
	tsImpl: typeof import("typescript"),
): string | null {
	if ("name" in node && node.name) {
		return node.name.getText(sourceFile);
	}

	if (
		(tsImpl.isArrowFunction(node) || tsImpl.isFunctionExpression(node)) &&
		node.parent &&
		tsImpl.isVariableDeclaration(node.parent) &&
		tsImpl.isIdentifier(node.parent.name)
	) {
		return node.parent.name.text;
	}

	return null;
}

function isAllowedProxyName(functionName: string): boolean {
	return functionName.startsWith("QO__");
}

function getReturnedCall(
	node: FunctionLikeWithBody,
	tsImpl: typeof import("typescript"),
): ts.CallExpression | null {
	if (tsImpl.isArrowFunction(node) && !tsImpl.isBlock(node.body)) {
		return tsImpl.isCallExpression(node.body) ? node.body : null;
	}

	if (
		!node.body ||
		!tsImpl.isBlock(node.body) ||
		node.body.statements.length !== 1
	) {
		return null;
	}

	const statement = node.body.statements[0];
	if (
		!statement ||
		!tsImpl.isReturnStatement(statement) ||
		!statement.expression
	) {
		return null;
	}

	return tsImpl.isCallExpression(statement.expression)
		? statement.expression
		: null;
}

function isNamedFunctionLike(
	node: ts.Node,
	sourceFile: ts.SourceFile,
	tsImpl: typeof import("typescript"),
): node is FunctionLikeWithBody {
	if (
		!tsImpl.isFunctionDeclaration(node) &&
		!tsImpl.isFunctionExpression(node) &&
		!tsImpl.isArrowFunction(node) &&
		!tsImpl.isMethodDeclaration(node)
	) {
		return false;
	}

	return getFunctionName(node, sourceFile, tsImpl) !== null;
}

function isModuleLevelFunctionLike(
	node: FunctionLikeWithBody,
	tsImpl: typeof import("typescript"),
): boolean {
	if (tsImpl.isFunctionDeclaration(node)) {
		return node.parent && tsImpl.isSourceFile(node.parent);
	}

	if (
		(tsImpl.isArrowFunction(node) || tsImpl.isFunctionExpression(node)) &&
		node.parent &&
		tsImpl.isVariableDeclaration(node.parent)
	) {
		const declarationList = node.parent.parent;
		const variableStatement = declarationList.parent;

		return (
			tsImpl.isVariableDeclarationList(declarationList) &&
			tsImpl.isVariableStatement(variableStatement) &&
			variableStatement.parent &&
			tsImpl.isSourceFile(variableStatement.parent)
		);
	}

	return false;
}

function collectIdentifierNames(
	node: ts.Node,
	tsImpl: typeof import("typescript"),
): Set<string> {
	const names = new Set<string>();

	function visit(child: ts.Node) {
		if (tsImpl.isIdentifier(child)) {
			names.add(child.text);
		}

		tsImpl.forEachChild(child, visit);
	}

	visit(node);
	return names;
}

function isForwardedParameterValue(
	node: ts.Expression,
	parameterNames: ReadonlySet<string>,
	tsImpl: typeof import("typescript"),
): boolean {
	if (tsImpl.isIdentifier(node)) {
		return parameterNames.has(node.text);
	}

	if (tsImpl.isPropertyAccessExpression(node)) {
		return isForwardedParameterValue(node.expression, parameterNames, tsImpl);
	}

	if (tsImpl.isArrayLiteralExpression(node)) {
		return node.elements.every((element) => {
			if (tsImpl.isSpreadElement(element)) {
				return isForwardedParameterValue(
					element.expression,
					parameterNames,
					tsImpl,
				);
			}

			return isForwardedParameterValue(element, parameterNames, tsImpl);
		});
	}

	if (tsImpl.isObjectLiteralExpression(node)) {
		return node.properties.every((property) => {
			if (tsImpl.isShorthandPropertyAssignment(property)) {
				return true;
			}

			if (tsImpl.isSpreadAssignment(property)) {
				return isForwardedParameterValue(
					property.expression,
					parameterNames,
					tsImpl,
				);
			}

			if (!tsImpl.isPropertyAssignment(property)) {
				return false;
			}

			return isForwardedParameterValue(
				property.initializer,
				parameterNames,
				tsImpl,
			);
		});
	}

	return false;
}

function isSimpleProxyCallee(
	node: ts.Expression,
	tsImpl: typeof import("typescript"),
): boolean {
	if (
		tsImpl.isIdentifier(node) ||
		node.kind === tsImpl.SyntaxKind.ThisKeyword
	) {
		return true;
	}

	if (tsImpl.isPropertyAccessExpression(node)) {
		return isSimpleProxyCallee(node.expression, tsImpl);
	}

	return false;
}

function isTrivialProxyCall(args: {
	readonly functionNode: FunctionLikeWithBody;
	readonly returnedCall: ts.CallExpression;
	readonly functionName: string;
	readonly ts: typeof import("typescript");
}): boolean {
	if (isAllowedProxyName(args.functionName)) {
		return false;
	}

	if (args.ts.isIdentifier(args.returnedCall.expression)) {
		if (args.returnedCall.expression.text === args.functionName) {
			return false;
		}
	}

	if (!isSimpleProxyCallee(args.returnedCall.expression, args.ts)) {
		return false;
	}

	const parameterNames = new Set(
		args.functionNode.parameters.flatMap((parameter) =>
			args.ts.isIdentifier(parameter.name) ? [parameter.name.text] : [],
		),
	);

	if (parameterNames.size === 0) {
		return false;
	}

	const returnedIdentifierNames = collectIdentifierNames(
		args.returnedCall,
		args.ts,
	);
	const forwardedParameterCount = [...parameterNames].filter((name) =>
		returnedIdentifierNames.has(name),
	).length;

	return (
		forwardedParameterCount > 0 &&
		args.returnedCall.arguments.every((argument) =>
			isForwardedParameterValue(argument, parameterNames, args.ts),
		)
	);
}

export function noTrivialProxyFunction(): LintRule {
	return {
		name: RULE_NAME,
		check(sourceFile, ts) {
			if (isFileIgnored(sourceFile, RULE_NAME)) return [];

			const diagnostics: LintDiagnostic[] = [];

			function visit(node: ts.Node) {
				if (!isNamedFunctionLike(node, sourceFile, ts)) {
					ts.forEachChild(node, visit);
					return;
				}

				if (!isModuleLevelFunctionLike(node, ts)) {
					ts.forEachChild(node, visit);
					return;
				}

				const returnedCall = getReturnedCall(node, ts);
				const functionName = getFunctionName(node, sourceFile, ts);

				if (
					returnedCall &&
					functionName &&
					!isIgnored(sourceFile, node, RULE_NAME) &&
					isTrivialProxyCall({
						functionNode: node,
						returnedCall,
						functionName,
						ts,
					})
				) {
					const start = sourceFile.getLineAndCharacterOfPosition(
						node.getStart(sourceFile),
					);
					diagnostics.push({
						file: sourceFile.fileName,
						line: start.line + 1,
						column: start.character + 1,
						message:
							"Avoid trivial proxy functions that only return another function call without adding logic. Inline the call or add real behavior.",
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
