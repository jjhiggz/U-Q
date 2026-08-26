import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { findRepeatedErrorMappings } from "./error-mapping.ts";

describe("dedupe-error-mapping", () => {
	it("finds materially identical Effect.mapError callbacks", async () => {
		const directory = await mkdtemp(join(tmpdir(), "error-mapping-"));
		const first = join(directory, "first.ts");
		const second = join(directory, "second.ts");
		await writeFile(
			first,
			`effect.pipe(Effect.mapError((error) => new DomainError({ cause: error })));`,
		);
		await writeFile(
			second,
			`effect.pipe(Effect.mapError((failure) => new DomainError({ cause: failure })));`,
		);

		const groups = await findRepeatedErrorMappings([join(directory, "*.ts")]);
		expect(groups).toHaveLength(1);
		expect(groups[0]?.occurrences).toHaveLength(2);
	});

	it("does not group different destination errors", async () => {
		const directory = await mkdtemp(join(tmpdir(), "error-mapping-"));
		await writeFile(
			join(directory, "first.ts"),
			`effect.pipe(Effect.mapError((error) => new FirstError({ cause: error })));`,
		);
		await writeFile(
			join(directory, "second.ts"),
			`effect.pipe(Effect.mapError((error) => new SecondError({ cause: error })));`,
		);

		expect(
			await findRepeatedErrorMappings([join(directory, "*.ts")]),
		).toHaveLength(0);
	});
});
