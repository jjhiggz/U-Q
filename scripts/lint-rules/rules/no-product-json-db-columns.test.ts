import { describe, expect, it } from "vitest";
import ts from "typescript";
import { noProductJsonDbColumns } from "./no-product-json-db-columns.ts";

function lint(code: string, fileName = "/repo/src/db/song.table.ts") {
	const sourceFile = ts.createSourceFile(
		fileName,
		code,
		ts.ScriptTarget.ESNext,
		true,
		ts.ScriptKind.TS,
	);
	return noProductJsonDbColumns().check(sourceFile, ts);
}

describe("no-product-json-db-columns", () => {
	it("flags direct jsonb product columns", () => {
		const result = lint(`
      import { jsonb } from "drizzle-orm/pg-core";
      export const column = jsonb("genres");
    `);

		expect(result).toHaveLength(1);
		expect(result[0]?.message).toContain("relationally");
	});

	it("flags aliased direct json columns", () => {
		const result = lint(`
      import { json as pgJson } from "drizzle-orm/pg-core";
      export const column = pgJson("metadata");
    `);

		expect(result).toHaveLength(1);
	});

	it("allows non-json relational columns", () => {
		expect(
			lint(`
        import { text } from "drizzle-orm/pg-core";
        export const column = text("title");
      `),
		).toHaveLength(0);
	});

	it("allows json inside the approved opaque helper", () => {
		expect(
			lint(
				`import { jsonb } from "drizzle-orm/pg-core"; export const x = jsonb("raw");`,
				"/repo/src/server/database/external-payload.column.ts",
			),
		).toHaveLength(0);
	});
});
