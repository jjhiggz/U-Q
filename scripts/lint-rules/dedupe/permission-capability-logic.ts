import { glob, readFile } from "node:fs/promises";
import ts from "typescript";
import { isDedupeRuleIgnored } from "./ignore.ts";

interface I_DupePermissionCandidate {
	readonly file: string;
	readonly line: number;
	readonly column: number;
	readonly name: string;
	readonly expression: string;
	readonly fingerprint: string;
}

interface I_DupePermissionGroup {
	readonly fingerprint: string;
	readonly expression: string;
	readonly occurrences: readonly I_DupePermissionCandidate[];
}

const SOURCE_PATTERNS = [
	"apps/backend/src/**/*.ts",
	"apps/web/src/**/*.ts",
	"apps/web/src/**/*.tsx",
	"apps/devtools/src/**/*.ts",
	"apps/devtools/src/**/*.tsx",
	"packages/shared/src/**/*.ts",
	"packages/seeding/src/**/*.ts",
];

const EXCLUDED_FILE_PATTERNS = [
	/\.test\.(ts|tsx)$/,
	/\.gen\.(ts|tsx)$/,
	/\/components\/ui\//,
];

const ACCESS_NAME_PATTERN =
	/(^is[A-Z].*(Accessible|Allowed|Authorized|Forbidden|Permitted)|Access|Permission|Authorized|Forbidden|Ownership|Owner|Member|Admin|Role)/;

const ACCESS_EXPRESSION_PATTERN =
	/\b(access|permission|authorized|forbidden|owner|member|admin|role|organization|restaurant|userId|session\.user)\b/i;

const BOOLEANISH_CALL_PATTERN = /^(and|or|not|eq|ne|isNull|isNotNull|inArray)$/;
const RULE_NAME = "dedupe-permission-capability-logic";

export async function findRepeatedPermissionCapabilityLogic(
	patterns = SOURCE_PATTERNS,
): Promise<readonly I_DupePermissionGroup[]> {
	const files = await listSourceFiles(patterns);
	const candidates: I_DupePermissionCandidate[] = [];

	for (const file of files) {
		const sourceText = await readFile(file, "utf8");
		const sourceFile = ts.createSourceFile(
			file,
			sourceText,
			ts.ScriptTarget.ESNext,
			true,
			file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
		);

		collectCandidates({ sourceFile, candidates });
	}

	const groupsByFingerprint = new Map<string, I_DupePermissionCandidate[]>();

	for (const candidate of candidates) {
		const group = groupsByFingerprint.get(candidate.fingerprint) ?? [];
		group.push(candidate);
		groupsByFingerprint.set(candidate.fingerprint, group);
	}

	return [...groupsByFingerprint.entries()]
		.filter(([, occurrences]) => occurrences.length >= 2)
		.map(([fingerprint, occurrences]) => ({
			fingerprint,
			expression: occurrences[0]?.expression ?? fingerprint,
			occurrences,
		}))
		.sort((left, right) => right.occurrences.length - left.occurrences.length);
}

function collectCandidates(args: {
	readonly sourceFile: ts.SourceFile;
	readonly candidates: I_DupePermissionCandidate[];
}) {
	const visit = (node: ts.Node) => {
		collectVariableCandidate({ ...args, node });
		collectFunctionCandidate({ ...args, node });

		ts.forEachChild(node, visit);
	};

	visit(args.sourceFile);
}

function collectVariableCandidate(args: {
	readonly sourceFile: ts.SourceFile;
	readonly candidates: I_DupePermissionCandidate[];
	readonly node: ts.Node;
}) {
	if (
		!ts.isVariableDeclaration(args.node) ||
		!ts.isIdentifier(args.node.name) ||
		!args.node.initializer
	) {
		return;
	}

	collectExpressionCandidate({
		sourceFile: args.sourceFile,
		candidates: args.candidates,
		name: args.node.name.text,
		node: args.node.initializer,
	});
}

function collectFunctionCandidate(args: {
	readonly sourceFile: ts.SourceFile;
	readonly candidates: I_DupePermissionCandidate[];
	readonly node: ts.Node;
}) {
	if (ts.isFunctionDeclaration(args.node) && args.node.name && args.node.body) {
		const returnedExpression = findSingleReturnExpression(args.node.body);
		if (returnedExpression) {
			collectExpressionCandidate({
				sourceFile: args.sourceFile,
				candidates: args.candidates,
				name: args.node.name.text,
				node: returnedExpression,
			});
		}
	}

	if (
		!ts.isVariableDeclaration(args.node) ||
		!ts.isIdentifier(args.node.name) ||
		!args.node.initializer
	) {
		return;
	}

	if (
		!ts.isArrowFunction(args.node.initializer) &&
		!ts.isFunctionExpression(args.node.initializer)
	) {
		return;
	}

	const expression = ts.isBlock(args.node.initializer.body)
		? findSingleReturnExpression(args.node.initializer.body)
		: args.node.initializer.body;

	if (!expression) {
		return;
	}

	collectExpressionCandidate({
		sourceFile: args.sourceFile,
		candidates: args.candidates,
		name: args.node.name.text,
		node: expression,
	});
}

function collectExpressionCandidate(args: {
	readonly sourceFile: ts.SourceFile;
	readonly candidates: I_DupePermissionCandidate[];
	readonly name: string;
	readonly node: ts.Expression;
}) {
	const expression = normalizeText(args.node.getText(args.sourceFile));

	if (
		isDedupeRuleIgnored({
			sourceFile: args.sourceFile,
			node: args.node,
			ruleName: RULE_NAME,
		})
	) {
		return;
	}

	if (expression.length < 20) {
		return;
	}

	if (!isAccessLike({ name: args.name, expression })) {
		return;
	}

	if (!isBooleanishExpression(args.node)) {
		return;
	}

	const position = args.sourceFile.getLineAndCharacterOfPosition(
		args.node.getStart(args.sourceFile),
	);

	args.candidates.push({
		file: args.sourceFile.fileName,
		line: position.line + 1,
		column: position.character + 1,
		name: args.name,
		expression,
		fingerprint: expression,
	});
}

function findSingleReturnExpression(block: ts.Block): ts.Expression | null {
	const returnStatements = block.statements.filter((statement) =>
		ts.isReturnStatement(statement),
	);

	if (returnStatements.length !== 1) {
		return null;
	}

	return returnStatements[0]?.expression ?? null;
}

function isAccessLike(args: {
	readonly name: string;
	readonly expression: string;
}): boolean {
	return (
		ACCESS_NAME_PATTERN.test(args.name) ||
		ACCESS_EXPRESSION_PATTERN.test(args.expression)
	);
}

function isBooleanishExpression(node: ts.Expression): boolean {
	if (
		ts.isBinaryExpression(node) ||
		ts.isPrefixUnaryExpression(node) ||
		ts.isConditionalExpression(node) ||
		ts.isParenthesizedExpression(node)
	) {
		return true;
	}

	if (!ts.isCallExpression(node)) {
		return false;
	}

	const callee = node.expression;
	if (ts.isIdentifier(callee)) {
		return BOOLEANISH_CALL_PATTERN.test(callee.text);
	}

	if (ts.isPropertyAccessExpression(callee)) {
		return BOOLEANISH_CALL_PATTERN.test(callee.name.text);
	}

	return false;
}

function normalizeText(text: string): string {
	return text.replace(/\s+/g, " ").trim();
}

async function listSourceFiles(
	patterns: readonly string[],
): Promise<readonly string[]> {
	const files = new Set<string>();

	for (const pattern of patterns) {
		for await (const file of glob(pattern)) {
			if (
				!EXCLUDED_FILE_PATTERNS.some((excludedPattern) =>
					excludedPattern.test(file),
				)
			) {
				files.add(file);
			}
		}
	}

	return [...files].sort();
}

export function formatPermissionCapabilityLogicReport(
	groups: readonly I_DupePermissionGroup[],
): string {
	if (groups.length === 0) {
		return "No repeated permission/capability logic candidates found.";
	}

	const findings = groups
		.map((group, index) => {
			const occurrences = group.occurrences
				.map(
					(occurrence) =>
						`  - ${occurrence.file}:${occurrence.line}:${occurrence.column} (${occurrence.name})`,
				)
				.join("\n");

			return [
				`${index + 1}. ${group.occurrences.length} repeated occurrences`,
				`Expression: ${group.expression}`,
				"Occurrences:",
				occurrences,
			].join("\n");
		})
		.join("\n\n");

	return findings;
}

if (import.meta.url === `file://${process.argv[1]}`) {
	const groups = await findRepeatedPermissionCapabilityLogic();
	console.log(
		`${formatPermissionCapabilityLogicReport(groups)}\n\nIf any finding looks like a bad signal, tell the user so we can re-examine this detector's constraint.`,
	);
}
