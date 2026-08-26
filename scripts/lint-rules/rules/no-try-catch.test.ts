import { describe, expect, it } from "vitest";
import ts from "typescript";
import { noTryCatch } from "./no-try-catch.ts";

function lint(code: string, fileName = "test.ts") {
	const sourceFile = ts.createSourceFile(
		fileName,
		code,
		ts.ScriptTarget.ESNext,
		true,
		ts.ScriptKind.TS,
	);
	return noTryCatch().check(sourceFile, ts);
}

describe("no-try-catch", () => {
	it("flags try/catch statements", () => {
		const result = lint(`try { run(); } catch (error) { report(error); }`);

		expect(result).toHaveLength(1);
		expect(result[0].rule).toBe("no-try-catch");
		expect(result[0].message).toContain("trySync/tryAsync");
		expect(result[0].message).toContain("Effect.try");
	});

	it("allows the try result helper implementation", () => {
		const result = lint(
			`export function trySync(run) { try { return run(); } catch (error) { return error; } }`,
			"/repo/src/lib/try-result.ts",
		);

		expect(result).toHaveLength(0);
	});

	it("flags embedded try/catch in inline script strings", () => {
		const result = lint(
			"const script = `(() => { try { run(); } catch { } })();`;",
		);

		expect(result).toHaveLength(1);
		expect(result[0].message).toContain("inline scripts");
	});

	it("allows with lint-ignore comment", () => {
		const code = `// lint-ignore: no-try-catch\ntry { run(); } catch (error) { report(error); }`;

		expect(lint(code)).toHaveLength(0);
	});

	it("allows with file-level lint-ignore comment", () => {
		const code = `// lint-ignore-file: no-try-catch\ntry { run(); } catch (error) { report(error); }`;

		expect(lint(code)).toHaveLength(0);
	});
});
