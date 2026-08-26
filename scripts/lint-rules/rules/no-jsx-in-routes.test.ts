import { describe, expect, it } from "vitest";
import ts from "typescript";
import { noJsxInRoutes } from "./no-jsx-in-routes.ts";

function lint(code: string, fileName = "apps/web/src/routes/demo.tsx") {
	const sourceFile = ts.createSourceFile(
		fileName,
		code,
		ts.ScriptTarget.ESNext,
		true,
		ts.ScriptKind.TSX,
	);
	return noJsxInRoutes().check(sourceFile, ts);
}

describe("no-jsx-in-routes", () => {
	it("flags JSX in non-root routes", () => {
		const result = lint(`
export const Route = createFileRoute("/demo")({
  component: () => <div>Demo</div>,
});
`);

		expect(result).toHaveLength(1);
		expect(result[0].rule).toBe("no-jsx-in-routes");
	});

	it("allows thin routes without JSX", () => {
		const result = lint(`
export const Route = createFileRoute("/demo")({
  component: C_Page__Demo,
});
`);

		expect(result).toHaveLength(0);
	});

	it("allows JSX in root routes", () => {
		const result = lint(
			`
function RootComponent() {
  return <html><body /></html>;
}
`,
			"apps/web/src/routes/__root.tsx",
		);

		expect(result).toHaveLength(0);
	});
});
