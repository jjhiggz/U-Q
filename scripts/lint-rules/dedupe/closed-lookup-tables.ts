import { glob, readFile } from "node:fs/promises";
import ts from "typescript";
import { isDedupeRuleIgnored } from "./ignore.ts";

interface I_DupeClosedLookupCandidate {
	readonly file: string;
	readonly line: number;
	readonly column: number;
	readonly name: string;
	readonly expression: string;
	readonly fingerprint: string;
}

interface I_DupeClosedLookupGroup {
	readonly fingerprint: string;
	readonly expression: string;
	readonly occurrences: readonly I_DupeClosedLookupCandidate[];
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
const MIN_KEY_COUNT = 3;
const RULE_NAME = "dedupe-closed-lookup-tables";

export async function findRepeatedClosedLookupTables(
	patterns = SOURCE_PATTERNS,
): Promise<readonly I_DupeClosedLookupGroup[]> {
	const files = await listSourceFiles(patterns);
	const candidates: I_DupeClosedLookupCandidate[] = [];

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

	const groupsByFingerprint = new Map<string, I_DupeClosedLookupCandidate[]>();

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
	readonly candidates: I_DupeClosedLookupCandidate[];
}) {
	const visit = (node: ts.Node) => {
		if (ts.isVariableDeclaration(node)) {
			collectVariableCandidate({ ...args, node });
		}

		ts.forEachChild(node, visit);
	};

	visit(args.sourceFile);
}

function collectVariableCandidate(args: {
	readonly sourceFile: ts.SourceFile;
	readonly candidates: I_DupeClosedLookupCandidate[];
	readonly node: ts.VariableDeclaration;
}) {
	if (!ts.isIdentifier(args.node.name) || !args.node.initializer) {
		return;
	}

	if (
		isDedupeRuleIgnored({
			sourceFile: args.sourceFile,
			node: args.node,
			ruleName: RULE_NAME,
		})
	) {
		return;
	}

	const objectLiteral = unwrapConstObjectLiteral(args.node.initializer, false);

	if (!objectLiteral) {
		return;
	}

	const fingerprint = getClosedLookupFingerprint(objectLiteral);

	if (!fingerprint) {
		return;
	}

	const position = args.sourceFile.getLineAndCharacterOfPosition(
		args.node.getStart(args.sourceFile),
	);

	args.candidates.push({
		file: args.sourceFile.fileName,
		line: position.line + 1,
		column: position.character + 1,
		name: args.node.name.text,
		expression: normalizeText(objectLiteral.getText(args.sourceFile)),
		fingerprint,
	});
}

function unwrapConstObjectLiteral(
	expression: ts.Expression,
	hasConstAssertion: boolean,
): ts.ObjectLiteralExpression | null {
	if (ts.isSatisfiesExpression(expression)) {
		return unwrapConstObjectLiteral(expression.expression, hasConstAssertion);
	}

	if (ts.isAsExpression(expression)) {
		const nextHasConstAssertion =
			hasConstAssertion || expression.type.getText() === "const";
		return unwrapConstObjectLiteral(
			expression.expression,
			nextHasConstAssertion,
		);
	}

	if (ts.isObjectLiteralExpression(expression) && hasConstAssertion) {
		return expression;
	}

	return null;
}

function getClosedLookupFingerprint(
	objectLiteral: ts.ObjectLiteralExpression,
): string | null {
	const parts: string[] = [];

	for (const property of objectLiteral.properties) {
		if (!ts.isPropertyAssignment(property)) {
			return null;
		}

		const key = getPropertyName(property.name);
		const value = getLiteralValue(property.initializer);

		if (!key || value === null) {
			return null;
		}

		parts.push(`${key}:${value}`);
	}

	if (parts.length < MIN_KEY_COUNT) {
		return null;
	}

	return parts.sort().join("|");
}

function getLiteralValue(expression: ts.Expression): string | null {
	if (ts.isStringLiteral(expression) || ts.isNumericLiteral(expression)) {
		return JSON.stringify(expression.text);
	}

	if (expression.kind === ts.SyntaxKind.TrueKeyword) {
		return "true";
	}

	if (expression.kind === ts.SyntaxKind.FalseKeyword) {
		return "false";
	}

	return null;
}

function getPropertyName(name: ts.PropertyName): string | null {
	if (
		ts.isIdentifier(name) ||
		ts.isStringLiteral(name) ||
		ts.isNumericLiteral(name)
	) {
		return name.text;
	}

	return null;
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

export function formatClosedLookupTablesReport(
	groups: readonly I_DupeClosedLookupGroup[],
): string {
	if (groups.length === 0) {
		return "No repeated closed lookup table candidates found.";
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
				`${index + 1}. ${group.occurrences.length} repeated closed lookup tables`,
				`Fingerprint: ${group.fingerprint}`,
				`Example: ${group.expression}`,
				"Occurrences:",
				occurrences,
			].join("\n");
		})
		.join("\n\n");

	return findings;
}

if (import.meta.url === `file://${process.argv[1]}`) {
	const groups = await findRepeatedClosedLookupTables();
	console.log(
		`${formatClosedLookupTablesReport(groups)}\n\nIf any finding looks like a bad signal, tell the user so we can re-examine this detector's constraint.`,
	);
}
