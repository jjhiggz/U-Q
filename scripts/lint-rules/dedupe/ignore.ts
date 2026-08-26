import type ts from "typescript";

export function isDedupeRuleIgnored(args: {
	readonly sourceFile: ts.SourceFile;
	readonly node: ts.Node;
	readonly ruleName: string;
}): boolean {
	const text = args.sourceFile.getFullText();
	const position = args.sourceFile.getLineAndCharacterOfPosition(
		args.node.getStart(args.sourceFile),
	);

	if (position.line === 0) {
		return false;
	}

	const previousLineStart = args.sourceFile.getPositionOfLineAndCharacter(
		position.line - 1,
		0,
	);
	const previousLineEnd = args.sourceFile.getPositionOfLineAndCharacter(
		position.line,
		0,
	);
	const previousLine = text.slice(previousLineStart, previousLineEnd).trim();
	const lintIgnorePrefix = `// lint-ignore: ${args.ruleName} -- `;
	const ignoreRulePrefix = `// ignore-rule ${args.ruleName} -- `;

	return (
		(previousLine.startsWith(lintIgnorePrefix) &&
			previousLine.slice(lintIgnorePrefix.length).trim().length > 0) ||
		(previousLine.startsWith(ignoreRulePrefix) &&
			previousLine.slice(ignoreRulePrefix.length).trim().length > 0)
	);
}
