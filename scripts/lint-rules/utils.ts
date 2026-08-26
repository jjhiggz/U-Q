import type ts from "typescript";

/**
 * Check if an entire file has a lint-ignore-file comment for the given rule.
 * Place at the top of the file:
 * - // lint-ignore-file: no-let
 * - // lint-ignore-file: no-array-mutation, no-as-cast
 */
export function isFileIgnored(
	sourceFile: ts.SourceFile,
	ruleName: string,
): boolean {
	const text = sourceFile.getFullText();

	// Check first 10 lines for file-level ignore
	const lines = text.split("\n").slice(0, 10);
	for (const line of lines) {
		const trimmed = line.trim();
		const match = trimmed.match(/^\/\/\s*lint-ignore-file:\s*(.+)$/);
		if (match) {
			const rules = match[1].split(",").map((r) => r.trim());
			if (rules.includes(ruleName)) return true;
		}
	}

	return false;
}

/**
 * Check if a node has a lint-ignore comment for the given rule.
 * Supports both single rule and comma-separated rules:
 * - // lint-ignore: no-let
 * - // lint-ignore: no-array-mutation, no-as-cast
 */
export function isIgnored(
	sourceFile: ts.SourceFile,
	node: ts.Node,
	ruleName: string,
): boolean {
	// Check file-level ignore first
	if (isFileIgnored(sourceFile, ruleName)) return true;

	const text = sourceFile.getFullText();
	const pos = sourceFile.getLineAndCharacterOfPosition(
		node.getStart(sourceFile),
	);

	if (pos.line === 0) return false;

	const prevLineStart = sourceFile.getPositionOfLineAndCharacter(
		pos.line - 1,
		0,
	);
	const prevLineEnd = sourceFile.getPositionOfLineAndCharacter(pos.line, 0);
	const prevLine = text.slice(prevLineStart, prevLineEnd).trim();

	// Match "// lint-ignore: rule1, rule2, ..."
	const match = prevLine.match(/^\/\/\s*lint-ignore:\s*(.+)$/);
	if (!match) return false;

	const rules = match[1].split(",").map((r) => r.trim());
	return rules.includes(ruleName);
}
