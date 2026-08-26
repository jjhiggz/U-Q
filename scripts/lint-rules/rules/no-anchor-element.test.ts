import { describe, it, expect } from "vitest";
import ts from "typescript";
import { noAnchorElement } from "./no-anchor-element.ts";

function lint(code: string, fileName = "apps/web/src/components/C_Nav.tsx") {
	const sourceFile = ts.createSourceFile(
		fileName,
		code,
		ts.ScriptTarget.ESNext,
		true,
		ts.ScriptKind.TSX,
	);
	return noAnchorElement().check(sourceFile, ts);
}

describe("no-anchor-element", () => {
	it("flags <a> with internal href", () => {
		const result = lint(`<a href="/dashboard">Dashboard</a>`);
		expect(result).toHaveLength(1);
		expect(result[0].rule).toBe("no-anchor-element");
		expect(result[0].message).toContain("Link");
		expect(result[0].message).toContain("@tanstack/react-router");
	});

	it("flags <a> with relative href", () => {
		const result = lint(`<a href="./settings">Settings</a>`);
		expect(result).toHaveLength(1);
	});

	it("flags self-closing <a />", () => {
		const result = lint(`<a href="/home" />`);
		expect(result).toHaveLength(1);
	});

	it("allows <a> with https:// href", () => {
		const result = lint(`<a href="https://example.com">External</a>`);
		expect(result).toHaveLength(0);
	});

	it("allows <a> with http:// href", () => {
		const result = lint(`<a href="http://example.com">External</a>`);
		expect(result).toHaveLength(0);
	});

	it("allows <a> with # anchor href", () => {
		const result = lint(`<a href="#section">Jump to section</a>`);
		expect(result).toHaveLength(0);
	});

	it("allows <a> with mailto: href", () => {
		const result = lint(`<a href="mailto:test@example.com">Email us</a>`);
		expect(result).toHaveLength(0);
	});

	it("allows <a> with tel: href", () => {
		const result = lint(`<a href="tel:+1234567890">Call us</a>`);
		expect(result).toHaveLength(0);
	});

	it("allows <a> with download attribute", () => {
		const result = lint(`<a href="/file.pdf" download>Download PDF</a>`);
		expect(result).toHaveLength(0);
	});

	it("allows <a> with download attribute (self-closing)", () => {
		const result = lint(`<a href="/file.pdf" download />`);
		expect(result).toHaveLength(0);
	});

	it("does not flag files outside src", () => {
		const result = lint(
			`<a href="/dashboard">Dashboard</a>`,
			"scripts/foo.tsx",
		);
		expect(result).toHaveLength(0);
	});

	it("allows dynamic URLs because they may be external", () => {
		expect(lint(`<a href={songUrl}>Song</a>`)).toHaveLength(0);
	});

	it("allows with lint-ignore comment", () => {
		const code = `// lint-ignore: no-anchor-element\n<a href="/special">Special case</a>`;
		expect(lint(code)).toHaveLength(0);
	});

	it("flags multiple <a> elements", () => {
		const code = `<><a href="/a">A</a><a href="/b">B</a></>`;
		const result = lint(code);
		expect(result).toHaveLength(2);
	});

	it("allows <Link> component (does not flag)", () => {
		const result = lint(`<Link to="/dashboard">Dashboard</Link>`);
		expect(result).toHaveLength(0);
	});
});
