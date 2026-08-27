import { config } from "dotenv";
import { Client } from "pg";

config({ path: ".env.local" });
config();

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
	throw new Error("DATABASE_URL environment variable is not set");
}

const url = new URL(databaseUrl);
const isLocalDatabase =
	["localhost", "127.0.0.1", "::1"].includes(url.hostname) ||
	url.hostname.endsWith(".localhost");
const isForced = Bun.argv.includes("--force");

if (!isLocalDatabase && !isForced) {
	throw new Error(
		"Refusing to clear a non-local database. Pass --force only if you are absolutely sure.",
	);
}

const client = new Client({ connectionString: databaseUrl });
await client.connect();

try {
	await client.query(`
		truncate table
			"account",
			"music_submission_data",
			"live_queues",
			"session",
			"songs",
			"submissions",
			"submitter_profiles",
			"user",
			"verification"
		restart identity cascade
	`);
	console.log(
		"Cleared app and auth data. Drizzle migration journal was preserved.",
	);
} finally {
	await client.end();
}
