import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import ts from "typescript";
import { declarativeBranching } from "./declarative-branching.ts";

async function lint(args: {
	readonly code: string;
	readonly isZoned: boolean;
}) {
	const dir = await mkdtemp(join(tmpdir(), "declarative-branching-zone-"));

	try {
		if (args.isZoned) {
			await writeFile(join(dir, ".declarative-branching-zone"), "");
		}

		const filePath = join(dir, "Component.tsx");
		const sourceFile = ts.createSourceFile(
			filePath,
			args.code,
			ts.ScriptTarget.ESNext,
			true,
			ts.ScriptKind.TSX,
		);

		return declarativeBranching().check(sourceFile, ts);
	} finally {
		await rm(dir, { recursive: true, force: true });
	}
}

describe("declarative-branching-zone", () => {
	it("does not enable declarative branching outside zones without file opt-in", async () => {
		const result = await lint({
			code: "export function Component() { if (value) return null; return null; }",
			isZoned: false,
		});

		expect(result).toHaveLength(0);
	});

	it("enables declarative branching inside zones without file opt-in comments", async () => {
		const result = await lint({
			code: "export function Component() { if (value) return null; return null; }",
			isZoned: true,
		});

		expect(result).toHaveLength(1);
		expect(result[0].rule).toBe("declarative-branching");
	});

	it("allows comment-free files inside declarative branching zones when they satisfy the rule", async () => {
		const result = await lint({
			code: "export function Component() { return null; }",
			isZoned: true,
		});

		expect(result).toHaveLength(0);
	});
});
