import type ts from "typescript";
import type { LintRule, LintDiagnostic } from "../types.ts";
import { isIgnored, isFileIgnored } from "../utils.ts";

const RULE_NAME = "prefer-object-params";

function isNamedVariableFunction(
	node: ts.ArrowFunction | ts.FunctionExpression,
	tsImpl: typeof import("typescript"),
): boolean {
	return (
		!!node.parent &&
		tsImpl.isVariableDeclaration(node.parent) &&
		tsImpl.isIdentifier(node.parent.name)
	);
}

function isObjectPropertyCallback(
	node: ts.Node,
	tsImpl: typeof import("typescript"),
): boolean {
	if (!node.parent || !tsImpl.isPropertyAssignment(node.parent)) return false;
	const objectLiteral = node.parent.parent;
	if (!tsImpl.isObjectLiteralExpression(objectLiteral)) return false;
	const objectParent = objectLiteral.parent;
	if (!objectParent) return false;
	return (
		tsImpl.isCallExpression(objectParent) ||
		tsImpl.isNewExpression(objectParent)
	);
}

function isDirectCallbackArgument(
	node: ts.Node,
	tsImpl: typeof import("typescript"),
): boolean {
	const parent = node.parent;
	if (!parent) return false;
	return tsImpl.isCallExpression(parent) || tsImpl.isNewExpression(parent);
}

function hasRestPublicShape(
	node:
		| ts.FunctionDeclaration
		| ts.MethodDeclaration
		| ts.MethodSignature
		| ts.PropertySignature
		| ts.ConstructorDeclaration
		| ts.ArrowFunction
		| ts.FunctionExpression,
	tsImpl: typeof import("typescript"),
): boolean {
	if ("parameters" in node) {
		return node.parameters.length === 1 && !!node.parameters[0]?.dotDotDotToken;
	}

	if (node.type && tsImpl.isFunctionTypeNode(node.type)) {
		return (
			node.type.parameters.length === 1 &&
			!!node.type.parameters[0]?.dotDotDotToken
		);
	}

	return false;
}

function getDefinitionName(
	node:
		| ts.FunctionDeclaration
		| ts.MethodDeclaration
		| ts.MethodSignature
		| ts.PropertySignature
		| ts.ConstructorDeclaration
		| ts.ArrowFunction
		| ts.FunctionExpression,
	sourceFile: ts.SourceFile,
	tsImpl: typeof import("typescript"),
): string | null {
	if (tsImpl.isConstructorDeclaration(node)) return "constructor";

	if (tsImpl.isPropertySignature(node)) {
		return node.name.getText(sourceFile);
	}

	if ("name" in node && node.name) {
		if (
			tsImpl.isIdentifier(node.name) ||
			tsImpl.isPrivateIdentifier(node.name)
		) {
			return node.name.getText(sourceFile);
		}
		if (
			tsImpl.isStringLiteral(node.name) ||
			tsImpl.isNumericLiteral(node.name)
		) {
			return node.name.getText(sourceFile);
		}
	}

	if (
		(tsImpl.isArrowFunction(node) || tsImpl.isFunctionExpression(node)) &&
		!!node.parent &&
		tsImpl.isVariableDeclaration(node.parent) &&
		tsImpl.isIdentifier(node.parent.name)
	) {
		return node.parent.name.text;
	}

	return null;
}

export function preferObjectParams(): LintRule {
	return {
		name: RULE_NAME,
		check(sourceFile, ts) {
			if (isFileIgnored(sourceFile, RULE_NAME)) return [];

			const diagnostics: LintDiagnostic[] = [];

			function visit(node: ts.Node) {
				const isCandidate =
					ts.isFunctionDeclaration(node) ||
					ts.isMethodDeclaration(node) ||
					ts.isMethodSignature(node) ||
					ts.isPropertySignature(node) ||
					ts.isConstructorDeclaration(node) ||
					ts.isArrowFunction(node) ||
					ts.isFunctionExpression(node);

				if (!isCandidate) {
					ts.forEachChild(node, visit);
					return;
				}

				if (ts.isPropertySignature(node)) {
					if (!node.type || !ts.isFunctionTypeNode(node.type)) {
						ts.forEachChild(node, visit);
						return;
					}

					if (node.type.parameters.length < 2 || hasRestPublicShape(node, ts)) {
						ts.forEachChild(node, visit);
						return;
					}
				} else if (node.parameters.length < 2 || hasRestPublicShape(node, ts)) {
					ts.forEachChild(node, visit);
					return;
				}

				if (ts.isArrowFunction(node) || ts.isFunctionExpression(node)) {
					if (!isNamedVariableFunction(node, ts)) {
						ts.forEachChild(node, visit);
						return;
					}
				}

				if (
					isDirectCallbackArgument(node, ts) ||
					isObjectPropertyCallback(node, ts)
				) {
					ts.forEachChild(node, visit);
					return;
				}

				const definitionName = getDefinitionName(node, sourceFile, ts);
				if (!definitionName || isIgnored(sourceFile, node, RULE_NAME)) {
					ts.forEachChild(node, visit);
					return;
				}

				const start = sourceFile.getLineAndCharacterOfPosition(
					node.getStart(sourceFile),
				);
				diagnostics.push({
					file: sourceFile.fileName,
					line: start.line + 1,
					column: start.character + 1,
					message:
						"Use a single object parameter for named app-owned functions with 2+ parameters so arguments are labeled at the definition boundary.",
					rule: RULE_NAME,
				});

				ts.forEachChild(node, visit);
			}

			visit(sourceFile);
			return diagnostics;
		},
	};
}
