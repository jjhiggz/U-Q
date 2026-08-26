import type ts from "typescript";
import type { LintRule, LintDiagnostic } from "../types.ts";
import { isIgnored, isFileIgnored } from "../utils.ts";

const RULE_NAME = "no-anchor-element";

export function noAnchorElement(): LintRule {
	return {
		name: RULE_NAME,
		check(sourceFile, ts) {
			const filePath = sourceFile.fileName;

			if (!filePath.includes("/src/")) return [];

			// Check file-level ignore
			if (isFileIgnored(sourceFile, RULE_NAME)) return [];

			const diagnostics: LintDiagnostic[] = [];

			function isExternalOrSpecialLink(
				node: ts.JsxOpeningLikeElement,
			): boolean {
				const hrefAttr = node.attributes.properties.find(
					(attr): attr is ts.JsxAttribute =>
						ts.isJsxAttribute(attr) && attr.name.getText(sourceFile) === "href",
				);

				if (!hrefAttr?.initializer) return false;

				// Check string literal href values
				if (ts.isStringLiteral(hrefAttr.initializer)) {
					const href = hrefAttr.initializer.text;
					// Allow external links, anchors, mailto, tel, and other protocols
					return (
						href.startsWith("http://") ||
						href.startsWith("https://") ||
						href.startsWith("#") ||
						href.startsWith("mailto:") ||
						href.startsWith("tel:")
					);
				}

				// Check JSX expression with template literal or string
				if (
					ts.isJsxExpression(hrefAttr.initializer) &&
					hrefAttr.initializer.expression
				) {
					const expr = hrefAttr.initializer.expression;
					if (ts.isStringLiteral(expr)) {
						const href = expr.text;
						return (
							href.startsWith("http://") ||
							href.startsWith("https://") ||
							href.startsWith("#") ||
							href.startsWith("mailto:") ||
							href.startsWith("tel:")
						);
					}

					// Dynamic URLs may be external. A separate validated ExternalLink
					// abstraction can tighten this later without false positives today.
					return true;
				}

				return false;
			}

			function hasDownloadAttribute(node: ts.JsxOpeningLikeElement): boolean {
				return node.attributes.properties.some(
					(attr) =>
						ts.isJsxAttribute(attr) &&
						attr.name.getText(sourceFile) === "download",
				);
			}

			function visit(node: ts.Node) {
				// Check for <a> JSX elements
				if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
					const tagName = node.tagName.getText(sourceFile);

					if (tagName === "a") {
						// Allow external links, special protocols, and download links
						if (
							!isExternalOrSpecialLink(node) &&
							!hasDownloadAttribute(node) &&
							!isIgnored(sourceFile, node, RULE_NAME)
						) {
							const start = sourceFile.getLineAndCharacterOfPosition(
								node.getStart(sourceFile),
							);
							diagnostics.push({
								file: sourceFile.fileName,
								line: start.line + 1,
								column: start.character + 1,
								message:
									"Use <Link> from @tanstack/react-router instead of <a> for internal navigation.",
								rule: "no-anchor-element",
							});
						}
					}
				}

				ts.forEachChild(node, visit);
			}

			visit(sourceFile);
			return diagnostics;
		},
	};
}
