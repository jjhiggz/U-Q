import { describe, expect, it } from "vitest";
import ts from "typescript";
import { noTrivialProxyFunction } from "./no-trivial-proxy-function.ts";

function lint(code: string) {
	const sourceFile = ts.createSourceFile(
		"test.ts",
		code,
		ts.ScriptTarget.ESNext,
		true,
		ts.ScriptKind.TS,
	);
	return noTrivialProxyFunction().check(sourceFile, ts);
}

describe("no-trivial-proxy-function", () => {
	it("flags direct wrappers", () => {
		const result = lint(`
      function parseWorkspace(input: unknown) {
        return SWorkspace.parse(input);
      }
    `);

		expect(result).toHaveLength(1);
	});

	it("flags wrappers that only forward object parameter values", () => {
		const result = lint(`
      export const query = <A, E>(args: Args<A, E>) => {
        return args.db.query({
          ErrorClass: args.ErrorClass,
          fn: args.fn,
        });
      }
    `);

		expect(result).toHaveLength(1);
	});

	it("allows wrappers that inject fixed values because they are not pure proxies", () => {
		const result = lint(`
      const toMenuGroupDatabaseError = (args: Args): E__MenuGroupDatabase =>
        mapTracedMessageError({
          error: args.error,
          operation: args.operation,
          context: args.context,
          ErrorClass: E__MenuGroupDatabase,
        });
    `);

		expect(result).toHaveLength(0);
	});

	it("allows named query option helpers because they are the server-state boundary", () => {
		const result = lint(`
      export const QO__todosList = (input: I_In_D__listTodos = {}) =>
        orpc.todos.list.queryOptions({ input });
    `);

		expect(result).toHaveLength(0);
	});

	it("flags expression-bodied named arrow wrappers", () => {
		const result = lint(`
      const runQuery = (args: Args) => queryClient.fetch(args);
    `);

		expect(result).toHaveLength(1);
	});

	it("allows local helpers inside larger functions", () => {
		const result = lint(`
      function Component() {
        const isHidden = (card: string) => hiddenCards.has(card);
        return null;
      }
    `);

		expect(result).toHaveLength(0);
	});

	it("allows small functions with actual logic", () => {
		const result = lint(`
      export function compareBySortOrder<T extends Row>(args: {
        readonly left: T;
        readonly right: T;
      }): number {
        return args.left.sortOrder - args.right.sortOrder;
      }
    `);

		expect(result).toHaveLength(0);
	});

	it("allows wrappers that transform arguments", () => {
		const result = lint(`
      function normalizeName(name: string) {
        return saveName(name.trim());
      }
    `);

		expect(result).toHaveLength(0);
	});

	it("allows wrappers with branching", () => {
		const result = lint(`
      function loadUser(id: string | null) {
        if (!id) return null;
        return repo.load(id);
      }
    `);

		expect(result).toHaveLength(0);
	});

	it("allows fluent match chains because the chain expresses logic", () => {
		const result = lint(`
      function getLabel(status: Status) {
        return match(status)
          .with("success", () => "Success")
          .with("error", () => "Error")
          .exhaustive();
      }
    `);

		expect(result).toHaveLength(0);
	});

	it("allows line-level ignores", () => {
		const result = lint(`
      // lint-ignore: no-trivial-proxy-function
      function stablePublicAlias(input: unknown) {
        return internalParse(input);
      }
    `);

		expect(result).toHaveLength(0);
	});
});
