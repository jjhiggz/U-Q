import { describe, expect, it } from "vitest";
import ts from "typescript";
import { seedNamingConventions } from "./seed-naming-conventions.ts";

function lint(code: string, fileName: string) {
	const sourceFile = ts.createSourceFile(
		fileName,
		code,
		ts.ScriptTarget.ESNext,
		true,
		ts.ScriptKind.TS,
	);
	return seedNamingConventions().check(sourceFile, ts);
}

describe("seed-naming-conventions", () => {
	it("requires exported seed factory functions to use F_Seed__ names", () => {
		const result = lint(
			`export const F_createUser = () => null;`,
			"apps/backend/src/devtools/seeding/users.factory.ts",
		);

		expect(result).toHaveLength(1);
		expect(result[0].message).toContain("F_Seed__");
	});

	it("allows exported seed factory function names", () => {
		const result = lint(
			`export const F_Seed__User = () => null;`,
			"apps/backend/src/devtools/seeding/users.factory.ts",
		);

		expect(result).toHaveLength(0);
	});

	it("requires exported seed interfaces to use I_Opts_Seed__ or I_Out_Seed__ names", () => {
		const result = lint(
			`export interface UserSeedOutput { id: string }`,
			"apps/backend/src/devtools/seeding/users.factory.ts",
		);

		expect(result).toHaveLength(1);
		expect(result[0].message).toContain("I_Out_Seed__");
	});

	it("allows exported seed interface names", () => {
		const result = lint(
			`export interface I_Out_Seed__User { id: string }`,
			"apps/backend/src/devtools/seeding/users.factory.ts",
		);

		expect(result).toHaveLength(0);
	});

	it("requires exported scenario instances to use SCN names", () => {
		const result = lint(
			`export const basics = new BasicsScenario();`,
			"apps/backend/src/devtools/seeding/scenarios/basics.ts",
		);

		expect(result).toHaveLength(1);
		expect(result[0].message).toContain("SCN_");
	});

	it("allows exported scenario instance names", () => {
		const result = lint(
			`export const SCN__basics = new BasicsScenario();`,
			"apps/backend/src/devtools/seeding/scenarios/basics.ts",
		);

		expect(result).toHaveLength(0);
	});

	it("requires exported scenario registries to use SCN_Registry__Seed names", () => {
		const result = lint(
			`export const scenarios = {};`,
			"apps/backend/src/devtools/seeding/scenarios/scenarios.registry.ts",
		);

		expect(result).toHaveLength(1);
		expect(result[0].message).toContain("SCN_Registry__Seed");
	});
});
