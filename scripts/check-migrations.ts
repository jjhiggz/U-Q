import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { config } from "dotenv";
import { Client } from "pg";

config({ path: ".env.local" });
config();

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
	throw new Error("DATABASE_URL environment variable is not set");
}

const journalPath = resolve(
	import.meta.dir,
	"..",
	"drizzle",
	"meta",
	"_journal.json",
);
const journal = JSON.parse(await readFile(journalPath, "utf8")) as {
	readonly entries: readonly {
		readonly idx: number;
		readonly tag: string;
	}[];
};

const client = new Client({ connectionString: databaseUrl });
await client.connect();

try {
	const tableExists = await client.query<{ exists: boolean }>(
		`
			select exists (
				select 1
				from information_schema.tables
				where table_schema = 'drizzle'
					and table_name = '__drizzle_migrations'
			) as "exists"
		`,
	);

	if (!tableExists.rows[0]?.exists) {
		throw new Error(
			"Missing drizzle.__drizzle_migrations. Run migrations against a clean database.",
		);
	}

	const applied = await client.query<{ id: number; created_at: string }>(
		`
			select id, created_at
			from drizzle.__drizzle_migrations
			order by id
		`,
	);

	const expectedCount = journal.entries.length;
	const appliedCount = applied.rows.length;

	if (appliedCount !== expectedCount) {
		throw new Error(
			`Migration journal mismatch: expected ${expectedCount} applied migrations, found ${appliedCount}. Run bun run db:migrate.`,
		);
	}

	const latest = journal.entries.at(-1);
	console.log(
		`Migration journal OK: ${appliedCount}/${expectedCount} migrations applied through ${latest?.tag ?? "unknown"}.`,
	);
} finally {
	await client.end();
}
