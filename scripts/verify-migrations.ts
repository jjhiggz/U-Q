import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";

const workspacePath = resolve(import.meta.dir, "..");
const drizzlePath = resolve(workspacePath, "drizzle");

const before = await snapshotDrizzleDirectory();
await run(["bun", "run", "db:generate"]);
const after = await snapshotDrizzleDirectory();

const added = [...after.keys()].filter((path) => !before.has(path));
const removed = [...before.keys()].filter((path) => !after.has(path));
const changed = [...after.keys()].filter(
	(path) => before.has(path) && before.get(path) !== after.get(path),
);

if (added.length || removed.length || changed.length) {
	console.error(
		"Migration generation changed drizzle/. Commit the generated migration files.",
	);
	for (const path of added) console.error(`  added: ${path}`);
	for (const path of removed) console.error(`  removed: ${path}`);
	for (const path of changed) console.error(`  changed: ${path}`);
	process.exit(1);
}

console.log("Migration files are up to date with the schema.");

async function snapshotDrizzleDirectory(): Promise<Map<string, string>> {
	const snapshot = new Map<string, string>();
	for await (const path of new Bun.Glob("**/*").scan(drizzlePath)) {
		const fullPath = join(drizzlePath, path);
		const file = Bun.file(fullPath);
		if (!(await file.exists())) continue;

		const contents = await readFile(fullPath);
		snapshot.set(
			relative(workspacePath, fullPath),
			createHash("sha256").update(contents).digest("hex"),
		);
	}
	return snapshot;
}

async function run(args: readonly string[]): Promise<void> {
	const process = Bun.spawn([...args], {
		cwd: workspacePath,
		stdin: "inherit",
		stdout: "inherit",
		stderr: "inherit",
	});
	const exitCode = await process.exited;
	if (exitCode !== 0) {
		throw new Error(`${args.join(" ")} exited with code ${exitCode}`);
	}
}
