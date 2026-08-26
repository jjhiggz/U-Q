import { glob, readFile } from "node:fs/promises";
import ts from "typescript";
import { isDedupeRuleIgnored } from "./ignore.ts";

interface I__ErrorMappingCandidate {
	readonly file: string;
	readonly line: number;
	readonly column: number;
	readonly mapperName: string;
	readonly expression: string;
	readonly fingerprint: string;
}

interface I__ErrorMappingGroup {
	readonly fingerprint: string;
	readonly expression: string;
	readonly occurrences: readonly I__ErrorMappingCandidate[];
}

const RULE_NAME = "dedupe-error-mapping";
const EXCLUDED_FILE_PATTERNS = [/\.test\.(ts|tsx)$/, /\.gen\.(ts|tsx)$/];

export async function findRepeatedErrorMappings(
	patterns: readonly string[] = ["src/**/*.ts"],
): Promise<readonly I__ErrorMappingGroup[]> {
	const candidates = await collectCandidates(patterns);
	const groups = new Map<string, I__ErrorMappingCandidate[]>();

	for (const candidate of candidates) {
		groups.set(candidate.fingerprint, [
			...(groups.get(candidate.fingerprint) ?? []),
			candidate,
		]);
	}

	return [...groups.entries()]
		.filter(([, occurrences]) => occurrences.length >= 2)
		.map(([fingerprint, occurrences]) => ({
			fingerprint,
			expression: occurrences[0]?.expression ?? fingerprint,
			occurrences,
		}))
		.sort((left, right) => right.occurrences.length - left.occurrences.length);
}

async function collectCandidates(
	patterns: readonly string[],
): Promise<readonly I__ErrorMappingCandidate[]> {
	const files = new Set<string>();
	for (const pattern of patterns) {
		for await (const file of glob(pattern)) {
			if (!EXCLUDED_FILE_PATTERNS.some((excluded) => excluded.test(file))) {
				files.add(file);
			}
		}
	}

	const candidates: I__ErrorMappingCandidate[] = [];
	for (const file of files) {
		const sourceFile = ts.createSourceFile(
			file,
			await readFile(file, "utf8"),
			ts.ScriptTarget.ESNext,
			true,
			file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
		);

		const visit = (node: ts.Node) => {
			if (ts.isCallExpression(node)) {
				const callback = getEffectMapErrorCallback(node);
				if (
					callback &&
					!isDedupeRuleIgnored({ sourceFile, node, ruleName: RULE_NAME })
				) {
					const position = sourceFile.getLineAndCharacterOfPosition(
						node.getStart(sourceFile),
					);
					const expression = normalizeText(callback.getText(sourceFile));
					candidates.push({
						file,
						line: position.line + 1,
						column: position.character + 1,
						mapperName: "Effect.mapError",
						expression,
						fingerprint: normalizeCallbackParameters(callback, expression),
					});
				}
			}
			ts.forEachChild(node, visit);
		};

		visit(sourceFile);
	}

	return candidates;
}

function getEffectMapErrorCallback(
	node: ts.CallExpression,
): ts.Expression | null {
	const callee = node.expression;
	if (!ts.isPropertyAccessExpression(callee)) return null;
	if (
		!ts.isIdentifier(callee.expression) ||
		callee.expression.text !== "Effect"
	) {
		return null;
	}
	if (callee.name.text !== "mapError") return null;
	return node.arguments[0] ?? null;
}

function normalizeCallbackParameters(
	callback: ts.Expression,
	expression: string,
): string {
	if (!ts.isArrowFunction(callback) && !ts.isFunctionExpression(callback)) {
		return expression;
	}

	return callback.parameters.reduce((fingerprint, parameter, index) => {
		if (!ts.isIdentifier(parameter.name)) return fingerprint;
		return fingerprint.replace(
			new RegExp(`\\b${escapeRegExp(parameter.name.text)}\\b`, "g"),
			`$arg${index}`,
		);
	}, expression);
}

function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeText(value: string): string {
	return value.replace(/\s+/g, " ").trim();
}

export function formatErrorMappingReport(
	groups: readonly I__ErrorMappingGroup[],
): string {
	if (groups.length === 0) {
		return "No repeated error mapping candidates found.";
	}

	return groups
		.map((group, index) => {
			const occurrences = group.occurrences
				.map(
					(occurrence) =>
						`  - ${occurrence.file}:${occurrence.line}:${occurrence.column} (${occurrence.mapperName})`,
				)
				.join("\n");

			return [
				`${index + 1}. ${group.occurrences.length} repeated mapping occurrences`,
				`Fingerprint: ${group.fingerprint}`,
				`Example: ${group.expression}`,
				"Occurrences:",
				occurrences,
			].join("\n");
		})
		.join("\n\n");
}
