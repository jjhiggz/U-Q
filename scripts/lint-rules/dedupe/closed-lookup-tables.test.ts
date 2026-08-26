import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { findRepeatedClosedLookupTables } from "./closed-lookup-tables.ts";

describe("closed-lookup-tables dedupe detector", () => {
	it("reports repeated const lookup tables with literal values", async () => {
		const dir = await mkdtemp(join(tmpdir(), "closed-lookup-dedupe-"));

		try {
			await writeFile(
				join(dir, "one.ts"),
				`const ITEM_MARGIN_PROPERTIES = {
          top: "marginTop",
          right: "marginRight",
          bottom: "marginBottom",
          left: "marginLeft",
        } as const;`,
			);
			await writeFile(
				join(dir, "two.ts"),
				`const SECTION_MARGIN_PROPERTIES = {
          left: "marginLeft",
          bottom: "marginBottom",
          right: "marginRight",
          top: "marginTop",
        } as const;`,
			);

			const groups = await findRepeatedClosedLookupTables([`${dir}/*.ts`]);

			expect(groups).toHaveLength(1);
			expect(groups[0]?.occurrences).toHaveLength(2);
			expect(groups[0]?.fingerprint).toContain("marginTop");
		} finally {
			await rm(dir, { recursive: true, force: true });
		}
	});

	it("does not report tiny lookup objects", async () => {
		const dir = await mkdtemp(join(tmpdir(), "closed-lookup-dedupe-"));

		try {
			await writeFile(
				join(dir, "one.ts"),
				`const ONE = { yes: true, no: false } as const;`,
			);
			await writeFile(
				join(dir, "two.ts"),
				`const TWO = { no: false, yes: true } as const;`,
			);

			const groups = await findRepeatedClosedLookupTables([`${dir}/*.ts`]);

			expect(groups).toHaveLength(0);
		} finally {
			await rm(dir, { recursive: true, force: true });
		}
	});
});
