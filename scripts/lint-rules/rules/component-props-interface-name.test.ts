import { describe, expect, it } from "vitest";
import ts from "typescript";
import { componentPropsInterfaceName } from "./component-props-interface-name.ts";

function lint(
	code: string,
	fileName = "apps/web/src/features/demo/components/C_Demo.tsx",
) {
	const sourceFile = ts.createSourceFile(
		fileName,
		code,
		ts.ScriptTarget.ESNext,
		true,
		ts.ScriptKind.TSX,
	);
	return componentPropsInterfaceName().check(sourceFile, ts);
}

describe("component-props-interface-name", () => {
	it("allows C__ components with matching props interface names", () => {
		const result = lint(`
interface I_Props_C__Demo {
  readonly title: string;
}

function C__Demo({ title }: I_Props_C__Demo) {
  return title;
}
`);

		expect(result).toHaveLength(0);
	});

	it("allows tagged C_Page__ components with matching props interface names", () => {
		const result = lint(`
interface I_Props_C_Page__Demo {
  readonly title: string;
}

function C_Page__Demo({ title }: I_Props_C_Page__Demo) {
  return title;
}
`);

		expect(result).toHaveLength(0);
	});

	it("flags C__ components with generic Props names", () => {
		const result = lint(`
interface Props {
  readonly title: string;
}

function C__Demo({ title }: Props) {
  return title;
}
`);

		expect(result).toHaveLength(1);
		expect(result[0].message).toContain("I_Props_C__Demo");
	});

	it("flags inline object props", () => {
		const result = lint(`
function C__Demo({ title }: { readonly title: string }) {
  return title;
}
`);

		expect(result).toHaveLength(1);
	});

	it("allows components without props", () => {
		const result = lint(`
function C__Demo() {
  return null;
}
`);

		expect(result).toHaveLength(0);
	});
});
