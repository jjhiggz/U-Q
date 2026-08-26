import type ts from "typescript";
import type { LintDiagnostic, LintRule } from "../types.ts";
import { isFileIgnored, isIgnored } from "../utils.ts";

const RULE_NAME = "component-props-interface-name";

export function componentPropsInterfaceName(): LintRule {
	return {
		name: RULE_NAME,
		check(sourceFile, ts) {
			if (!sourceFile.fileName.includes("/src/")) return [];
			if (isFileIgnored(sourceFile, RULE_NAME)) return [];

			const diagnostics: LintDiagnostic[] = [];

			function visit(node: ts.Node) {
				if (
					ts.isFunctionDeclaration(node) &&
					isComponentName(node.name?.text)
				) {
					const firstParam = node.parameters[0];
					if (firstParam) {
						checkComponentParam({
							componentName: node.name.text,
							param: firstParam,
							diagnostics,
							sourceFile,
							ts,
						});
					}
				}

				ts.forEachChild(node, visit);
			}

			visit(sourceFile);
			return diagnostics;
		},
	};
}

function checkComponentParam(args: {
	readonly componentName: string;
	readonly param: ts.ParameterDeclaration;
	readonly diagnostics: LintDiagnostic[];
	readonly sourceFile: ts.SourceFile;
	readonly ts: typeof ts;
}) {
	const expectedName = getExpectedPropsName(args.componentName);
	const typeName = getTypeReferenceName({
		typeNode: args.param.type,
		ts: args.ts,
	});

	if (typeName === expectedName) return;
	if (isIgnored(args.sourceFile, args.param, RULE_NAME)) return;

	const start = args.sourceFile.getLineAndCharacterOfPosition(
		args.param.getStart(args.sourceFile),
	);
	args.diagnostics.push({
		file: args.sourceFile.fileName,
		line: start.line + 1,
		column: start.character + 1,
		message: `Props for ${args.componentName} must use ${expectedName}.`,
		rule: RULE_NAME,
	});
}

function isComponentName(name: string | undefined): name is string {
	return Boolean(
		name && (name.startsWith("C__") || /^C_[A-Za-z0-9]+__/.test(name)),
	);
}

function getExpectedPropsName(componentName: string): string {
	return `I_Props_${componentName}`;
}

function getTypeReferenceName(args: {
	readonly typeNode: ts.TypeNode | undefined;
	readonly ts: typeof ts;
}): string | null {
	if (!args.typeNode) return null;
	if (!args.ts.isTypeReferenceNode(args.typeNode)) return null;

	const typeName = args.typeNode.typeName;
	if (!args.ts.isIdentifier(typeName)) return null;

	return typeName.text;
}
