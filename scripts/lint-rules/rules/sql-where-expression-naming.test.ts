import { describe, expect, it } from "vitest";
import ts from "typescript";
import { sqlWhereExpressionNaming } from "./sql-where-expression-naming.ts";

function lint(
	code: string,
	fileName = "apps/backend/src/restaurants/restaurant-access.sql.ts",
) {
	const sourceFile = ts.createSourceFile(
		fileName,
		code,
		ts.ScriptTarget.ESNext,
		true,
		ts.ScriptKind.TS,
	);
	return sqlWhereExpressionNaming().check(sourceFile, ts);
}

describe("sql-where-expression-naming", () => {
	it("requires exported const where expression helpers to use SQL_Where names", () => {
		const result = lint(
			`
        import { eq, or } from "drizzle-orm";

        export const getRestaurantAccessWhere = (userId: string) =>
          or(eq(restaurant.userId, userId), eq(member.userId, userId));
      `,
		);

		expect(result).toHaveLength(1);
		expect(result[0].message).toContain("SQL_Where__");
	});

	it("requires exported function where expression helpers to use SQL_Where names", () => {
		const result = lint(
			`
        import { eq } from "drizzle-orm";

        export function restaurantAccess(userId: string) {
          return eq(restaurant.userId, userId);
        }
      `,
		);

		expect(result).toHaveLength(1);
		expect(result[0].message).toContain("SQL_Where__");
	});

	it("allows exported SQL_Where helpers", () => {
		const result = lint(
			`
        import { eq, or } from "drizzle-orm";

        export const SQL_Where__RestaurantAccess = (userId: string) =>
          or(eq(restaurant.userId, userId), eq(member.userId, userId));
      `,
		);

		expect(result).toHaveLength(0);
	});

	it("requires the name segment after SQL_Where to start uppercase", () => {
		const result = lint(
			`
        import { eq } from "drizzle-orm";

        export const SQL_Where__restaurantAccess = (userId: string) =>
          eq(restaurant.userId, userId);
      `,
		);

		expect(result).toHaveLength(1);
	});

	it("ignores non-sql files", () => {
		const result = lint(
			`
        import { eq } from "drizzle-orm";

        export const getRestaurantAccessWhere = (userId: string) =>
          eq(restaurant.userId, userId);
      `,
			"apps/backend/src/restaurants/restaurant-access.service.ts",
		);

		expect(result).toHaveLength(0);
	});

	it("does not require SQL_Where for non-where sql helpers", () => {
		const result = lint(
			`
        import { desc } from "drizzle-orm";

        export const SQL_Order__RestaurantName = () => desc(restaurant.name);
      `,
		);

		expect(result).toHaveLength(0);
	});
});
