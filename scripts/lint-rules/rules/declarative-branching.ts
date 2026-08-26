import type ts from "typescript";
import type { LintDiagnostic, LintRule } from "../types.ts";
import { isFileIgnored, isIgnored } from "../utils.ts";
import { isInDeclarativeBranchingZone } from "./declarative-branching-zone.ts";

const RULE_NAME = "declarative-branching";
const ENABLE_PATTERN = /^\s*\/\/\s*lint-enable:\s*declarative-branching\b/m;

export function declarativeBranching(): LintRule {
	return {
		name: RULE_NAME,
		check(sourceFile, ts) {
			if (
				isFileIgnored(sourceFile, RULE_NAME) ||
				!isDeclarativeBranchingEnabled(sourceFile)
			) {
				return [];
			}

			const diagnostics: LintDiagnostic[] = [];

			function visit(node: ts.Node) {
				if (ts.isIfStatement(node) && !isIgnored(sourceFile, node, RULE_NAME)) {
					checkIfStatement({ diagnostics, node, sourceFile, ts });
				}

				if (
					ts.isJsxExpression(node) &&
					!isIgnored(sourceFile, node, RULE_NAME)
				) {
					checkJsxExpression({ diagnostics, node, sourceFile, ts });
				}

				if (
					ts.isCallExpression(node) &&
					!isIgnored(sourceFile, node, RULE_NAME)
				) {
					checkMatchCall({ diagnostics, node, sourceFile, ts });
				}

				ts.forEachChild(node, visit);
			}

			visit(sourceFile);
			return diagnostics;
		},
	};
}

function isDeclarativeBranchingEnabled(sourceFile: ts.SourceFile): boolean {
	return (
		ENABLE_PATTERN.test(sourceFile.getFullText()) ||
		sourceFile.fileName.endsWith(".page.tsx") ||
		sourceFile.fileName.endsWith(".layout.tsx") ||
		isInDeclarativeBranchingZone(sourceFile.fileName)
	);
}

function checkIfStatement(args: {
	readonly diagnostics: LintDiagnostic[];
	readonly node: ts.IfStatement;
	readonly sourceFile: ts.SourceFile;
	readonly ts: typeof import("typescript");
}) {
	if (!isInsideImperative(args.node, args.ts)) {
		pushDiagnostic({
			diagnostics: args.diagnostics,
			message:
				"Avoid if statements in declarative files. Use match() for state classification, a typed lookup object for static maps, or move runtime guard control flow into a /** @imperative */ function.",
			node: args.node,
			sourceFile: args.sourceFile,
		});
		return;
	}

	if (hasIfAncestor(args.node, args.ts)) {
		pushDiagnostic({
			diagnostics: args.diagnostics,
			message:
				"Nested imperative if statements hide control flow. Use sequential guard exits for runtime checks, or use match()/a resolver when the nested condition classifies domain or view state.",
			node: args.node,
			sourceFile: args.sourceFile,
		});
		return;
	}

	if (containsDomainBranch(args.node.expression, args.ts)) {
		pushDiagnostic({
			diagnostics: args.diagnostics,
			message:
				"Avoid domain/state branching with if, even inside /** @imperative */ code. Use match() for small classifications, or extract a resolver that returns a command/outcome for larger workflow decisions.",
			node: args.node,
			sourceFile: args.sourceFile,
		});
		return;
	}

	if (hasIfDescendant(args.node, args.ts)) return;

	if (!isGuardExitIf(args.node, args.ts)) {
		pushDiagnostic({
			diagnostics: args.diagnostics,
			message:
				"Imperative if statements should be guard exits. End the branch with return/throw/break/continue, or use a direct boolean expression/match() for conditional side effects.",
			node: args.node,
			sourceFile: args.sourceFile,
		});
	}
}

function checkJsxExpression(args: {
	readonly diagnostics: LintDiagnostic[];
	readonly node: ts.JsxExpression;
	readonly sourceFile: ts.SourceFile;
	readonly ts: typeof import("typescript");
}) {
	if (!args.node.expression) return;
	if (!isJsxChildExpression(args.node, args.ts)) return;

	const offendingNode = findJsxBooleanBranch(args.node.expression, args.ts);
	if (!offendingNode) return;

	pushDiagnostic({
		diagnostics: args.diagnostics,
		message:
			"Avoid inline JSX boolean branching. Use an inline match() expression, a small component, or a named render helper.",
		node: offendingNode,
		sourceFile: args.sourceFile,
	});
}

function checkMatchCall(args: {
	readonly diagnostics: LintDiagnostic[];
	readonly node: ts.CallExpression;
	readonly sourceFile: ts.SourceFile;
	readonly ts: typeof import("typescript");
}) {
	if (!isMatchCall(args.node, args.ts)) return;
	if (isInsideJsx(args.node, args.ts)) return;

	const [firstArgument] = args.node.arguments;
	if (!firstArgument || !isBooleanLikeMatchArgument(firstArgument, args.ts))
		return;

	pushDiagnostic({
		diagnostics: args.diagnostics,
		message:
			"Avoid match() for a single boolean outside JSX. Use a direct boolean expression, a flat imperative guard, or match a multi-fact state object instead.",
		node: args.node,
		sourceFile: args.sourceFile,
	});
}

function isJsxChildExpression(
	node: ts.JsxExpression,
	ts: typeof import("typescript"),
): boolean {
	return ts.isJsxElement(node.parent) || ts.isJsxFragment(node.parent);
}

function isInsideJsx(node: ts.Node, ts: typeof import("typescript")): boolean {
	let current = node.parent;

	while (current) {
		if (
			ts.isJsxExpression(current) ||
			ts.isJsxElement(current) ||
			ts.isJsxFragment(current) ||
			ts.isJsxSelfClosingElement(current)
		) {
			return true;
		}

		if (isFunctionLike(current, ts)) return false;

		current = current.parent;
	}

	return false;
}

function isInsideImperative(
	node: ts.Node,
	ts: typeof import("typescript"),
): boolean {
	let current: ts.Node | undefined = node;

	while (current) {
		if (isFunctionLike(current, ts) && hasImperativeTag(current)) return true;
		current = current.parent;
	}

	return false;
}

function hasIfAncestor(
	node: ts.IfStatement,
	ts: typeof import("typescript"),
): boolean {
	let current = node.parent;

	while (current) {
		if (ts.isIfStatement(current)) return true;
		if (isFunctionLike(current, ts)) return false;
		current = current.parent;
	}

	return false;
}

function hasIfDescendant(
	node: ts.IfStatement,
	ts: typeof import("typescript"),
): boolean {
	const thenHasNestedIf = node.thenStatement
		.getChildren()
		.some((child) => containsIfStatement(child, ts));
	const elseHasNestedIf =
		node.elseStatement
			?.getChildren()
			.some((child) => containsIfStatement(child, ts)) ?? false;

	return thenHasNestedIf || elseHasNestedIf;
}

function containsIfStatement(
	node: ts.Node,
	ts: typeof import("typescript"),
): boolean {
	if (ts.isIfStatement(node)) return true;
	if (isFunctionLike(node, ts)) return false;

	return node.getChildren().some((child) => containsIfStatement(child, ts));
}

function isGuardExitIf(
	node: ts.IfStatement,
	ts: typeof import("typescript"),
): boolean {
	if (node.elseStatement) {
		return (
			statementExits(node.thenStatement, ts) &&
			statementExits(node.elseStatement, ts)
		);
	}

	return statementExits(node.thenStatement, ts);
}

function statementExits(
	node: ts.Statement,
	ts: typeof import("typescript"),
): boolean {
	if (
		ts.isReturnStatement(node) ||
		ts.isThrowStatement(node) ||
		ts.isBreakStatement(node) ||
		ts.isContinueStatement(node)
	) {
		return true;
	}

	if (ts.isBlock(node)) {
		const lastStatement = node.statements.at(-1);
		return lastStatement ? statementExits(lastStatement, ts) : false;
	}

	if (ts.isIfStatement(node)) return isGuardExitIf(node, ts);

	return false;
}

function isFunctionLike(
	node: ts.Node,
	ts: typeof import("typescript"),
): node is ts.FunctionLikeDeclaration {
	return (
		ts.isFunctionDeclaration(node) ||
		ts.isFunctionExpression(node) ||
		ts.isArrowFunction(node) ||
		ts.isMethodDeclaration(node)
	);
}

function hasImperativeTag(node: ts.FunctionLikeDeclaration): boolean {
	const fullText = node.getFullText();
	return /\/\*\*[\s\S]*?@imperative[\s\S]*?\*\//.test(fullText);
}

function containsDomainBranch(
	node: ts.Node,
	ts: typeof import("typescript"),
): boolean {
	if (
		ts.isBinaryExpression(node) &&
		isEqualityOperator(node.operatorToken.kind, ts) &&
		(isDomainDiscriminant(node.left, ts) ||
			isDomainDiscriminant(node.right, ts))
	) {
		return true;
	}

	return node.getChildren().some((child) => containsDomainBranch(child, ts));
}

function isEqualityOperator(
	kind: ts.SyntaxKind,
	ts: typeof import("typescript"),
): boolean {
	return (
		kind === ts.SyntaxKind.EqualsEqualsEqualsToken ||
		kind === ts.SyntaxKind.ExclamationEqualsEqualsToken
	);
}

function isDomainDiscriminant(
	node: ts.Node,
	ts: typeof import("typescript"),
): boolean {
	if (ts.isPropertyAccessExpression(node)) {
		return DOMAIN_DISCRIMINANTS.has(node.name.text);
	}

	if (ts.isIdentifier(node)) {
		return DOMAIN_DISCRIMINANTS.has(node.text);
	}

	return false;
}

const DOMAIN_DISCRIMINANTS = new Set([
	"_tag",
	"entityType",
	"field",
	"kind",
	"mode",
	"role",
	"status",
	"type",
	"variant",
]);

function isMatchCall(
	node: ts.CallExpression,
	ts: typeof import("typescript"),
): boolean {
	return ts.isIdentifier(node.expression) && node.expression.text === "match";
}

function isBooleanLikeMatchArgument(
	node: ts.Expression,
	ts: typeof import("typescript"),
): boolean {
	if (
		node.kind === ts.SyntaxKind.TrueKeyword ||
		node.kind === ts.SyntaxKind.FalseKeyword
	) {
		return true;
	}

	if (ts.isIdentifier(node)) return isBooleanLikeName(node.text);

	if (ts.isPropertyAccessExpression(node))
		return isBooleanLikeName(node.name.text);

	if (ts.isParenthesizedExpression(node)) {
		return isBooleanLikeMatchArgument(node.expression, ts);
	}

	return false;
}

function isBooleanLikeName(name: string): boolean {
	return /^(is|has|can|should)[A-Z_]/.test(name);
}

function findJsxBooleanBranch(
	node: ts.Node,
	ts: typeof import("typescript"),
): ts.Node | null {
	if (
		ts.isBinaryExpression(node) &&
		isBooleanBranchOperator(node.operatorToken.kind, ts) &&
		isComplexBooleanBranch(node, ts)
	) {
		return node;
	}

	return null;
}

function isBooleanBranchOperator(
	kind: ts.SyntaxKind,
	ts: typeof import("typescript"),
): boolean {
	return (
		kind === ts.SyntaxKind.AmpersandAmpersandToken ||
		kind === ts.SyntaxKind.BarBarToken
	);
}

function isComplexBooleanBranch(
	node: ts.BinaryExpression,
	ts: typeof import("typescript"),
): boolean {
	if (node.operatorToken.kind === ts.SyntaxKind.BarBarToken) return true;

	const conditionNode = isJsxRenderableExpression(node.right, ts)
		? node.left
		: node;
	const operatorCount = 1 + countBooleanBranchOperators(conditionNode, ts);

	return operatorCount > 1 || containsOrBranch(conditionNode, ts);
}

function isJsxRenderableExpression(
	node: ts.Node,
	ts: typeof import("typescript"),
): boolean {
	if (
		ts.isJsxElement(node) ||
		ts.isJsxSelfClosingElement(node) ||
		ts.isJsxFragment(node)
	) {
		return true;
	}

	if (ts.isParenthesizedExpression(node))
		return isJsxRenderableExpression(node.expression, ts);

	return false;
}

function countBooleanBranchOperators(
	node: ts.Node,
	ts: typeof import("typescript"),
): number {
	const selfCount =
		ts.isBinaryExpression(node) &&
		isBooleanBranchOperator(node.operatorToken.kind, ts)
			? 1
			: 0;

	return node
		.getChildren()
		.reduce(
			(count, child) => count + countBooleanBranchOperators(child, ts),
			selfCount,
		);
}

function containsOrBranch(
	node: ts.Node,
	ts: typeof import("typescript"),
): boolean {
	if (
		ts.isBinaryExpression(node) &&
		node.operatorToken.kind === ts.SyntaxKind.BarBarToken
	) {
		return true;
	}

	return node.getChildren().some((child) => containsOrBranch(child, ts));
}

function pushDiagnostic(args: {
	readonly diagnostics: LintDiagnostic[];
	readonly message: string;
	readonly node: ts.Node;
	readonly sourceFile: ts.SourceFile;
}) {
	const start = args.sourceFile.getLineAndCharacterOfPosition(
		args.node.getStart(args.sourceFile),
	);
	args.diagnostics.push({
		file: args.sourceFile.fileName,
		line: start.line + 1,
		column: start.character + 1,
		message: args.message,
		rule: RULE_NAME,
	});
}
