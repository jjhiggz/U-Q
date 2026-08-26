import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { findRepeatedPermissionCapabilityLogic } from "./permission-capability-logic.ts";

describe("permission-capability-logic dedupe detector", () => {
	it("reports repeated access predicates", async () => {
		const dir = await mkdtemp(join(tmpdir(), "permission-dedupe-"));

		try {
			await writeFile(
				join(dir, "one.ts"),
				`const getRestaurantAccessWhere = (userId: string) =>
          or(eq(restaurant.userId, userId), eq(member.userId, userId));`,
			);
			await writeFile(
				join(dir, "two.ts"),
				`const getRestaurantAccessWhere = (userId: string) =>
          or(eq(restaurant.userId, userId), eq(member.userId, userId));`,
			);

			const groups = await findRepeatedPermissionCapabilityLogic([
				`${dir}/*.ts`,
			]);

			expect(groups).toHaveLength(1);
			expect(groups[0]?.occurrences).toHaveLength(2);
			expect(groups[0]?.expression).toContain("restaurant.userId");
		} finally {
			await rm(dir, { recursive: true, force: true });
		}
	});

	it("does not report repeated generic UI capability expressions", async () => {
		const dir = await mkdtemp(join(tmpdir(), "permission-dedupe-"));

		try {
			await writeFile(
				join(dir, "one.ts"),
				`const canSubmit = isDirty && !isPending;`,
			);
			await writeFile(
				join(dir, "two.ts"),
				`const canSubmit = isDirty && !isPending;`,
			);

			const groups = await findRepeatedPermissionCapabilityLogic([
				`${dir}/*.ts`,
			]);

			expect(groups).toHaveLength(0);
		} finally {
			await rm(dir, { recursive: true, force: true });
		}
	});
});
