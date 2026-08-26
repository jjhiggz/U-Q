import { describe, it, expect } from "vitest";
import ts from "typescript";
import { preferObjectParams } from "./prefer-object-params.ts";

function lint(code: string, fileName = "test.ts") {
	const sourceFile = ts.createSourceFile(
		fileName,
		code,
		ts.ScriptTarget.ESNext,
		true,
		fileName.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
	);
	return preferObjectParams().check(sourceFile, ts);
}

describe("prefer-object-params", () => {
	it("flags function declarations with 2 params", () => {
		const result = lint(
			`function buildDateRangeFilter(dateFrom: Date, dateTo: Date) {}`,
		);
		expect(result).toHaveLength(1);
		expect(result[0].rule).toBe("prefer-object-params");
	});

	it("flags exported arrow functions assigned to named variables", () => {
		const result = lint(
			`export const query = (db: Db, ErrorClass: ErrorCtor, fn: Fn) => fn(db);`,
		);
		expect(result).toHaveLength(1);
	});

	it("flags method signatures", () => {
		const result = lint(`
      type Repo = {
        list: (input: Input, userId: string) => Result;
      };
    `);
		expect(result).toHaveLength(1);
	});

	it("flags class methods", () => {
		const result = lint(`
      class X {
        update(userId: string, role: string) {}
      }
    `);
		expect(result).toHaveLength(1);
	});

	it("flags constructors with 2 params", () => {
		const result = lint(`
      class X {
        constructor(userId: string, role: string) {}
      }
    `);
		expect(result).toHaveLength(1);
	});

	it("allows single object parameter style", () => {
		const result = lint(`
      function buildDateRangeFilter(args: { dateFrom?: Date; dateTo?: Date }) {}
    `);
		expect(result).toHaveLength(0);
	});

	it("allows React props objects", () => {
		const result = lint(
			`function C_FilterText({ value, onChange }: Props) { return null; }`,
			"test.tsx",
		);
		expect(result).toHaveLength(0);
	});

	it("allows rest parameter helpers", () => {
		const result = lint(
			`function cn(...inputs: string[]) { return inputs.join(" "); }`,
		);
		expect(result).toHaveLength(0);
	});

	it("allows callback arguments", () => {
		const result = lint(`arr.map((v, i) => i);`);
		expect(result).toHaveLength(0);
	});

	it("allows reduce callbacks", () => {
		const result = lint(`items.reduce((acc, s) => acc + s, 0);`);
		expect(result).toHaveLength(0);
	});

	it("allows adapter lambdas in config objects", () => {
		const result = lint(`
      new RPCLink({
        fetch: (request, init) => fetch(request, init),
      });
    `);
		expect(result).toHaveLength(0);
	});

	it("allows inline callback properties in API configs", () => {
		const result = lint(`
      useMutation({
        onSuccess: (data, vars) => {
          console.log(data, vars);
        },
      });
    `);
		expect(result).toHaveLength(0);
	});

	it("allows file-level ignore comments", () => {
		const result = lint(`
      // lint-ignore-file: prefer-object-params
      function buildDateRangeFilter(dateFrom: Date, dateTo: Date) {}
    `);
		expect(result).toHaveLength(0);
	});

	it("allows line-level ignore comments", () => {
		const result = lint(`
      // lint-ignore: prefer-object-params
      function buildDateRangeFilter(dateFrom: Date, dateTo: Date) {}
    `);
		expect(result).toHaveLength(0);
	});
});
