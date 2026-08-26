import { createHash } from "node:crypto";
import { basename, resolve } from "node:path";

const DEFAULT_APP_PORT = 3000;
const DEFAULT_DB_PORT = 55432;
const DATABASE_USER = "musicqueue";
const DATABASE_PASSWORD = "musicqueue";
const DATABASE_NAME = "musicqueue";

type Command = "db:down" | "db:up" | "dev" | "dev:setup";

const command = Bun.argv[2] as Command | undefined;
const cliArgs = Bun.argv.slice(3);
const appPort = readPort(["-p", "--port"], DEFAULT_APP_PORT);
const databasePort = readPort(["-dbp", "--db-port"], DEFAULT_DB_PORT);
const workspacePath = resolve(import.meta.dir, "..");
const workspaceName = basename(workspacePath)
	.toLowerCase()
	.replace(/[^a-z0-9_-]/g, "-");
const workspaceHash = createHash("sha256")
	.update(workspacePath)
	.digest("hex")
	.slice(0, 8);
const composeProject = `${workspaceName}-${workspaceHash}`;
const databaseUrl = `postgresql://${DATABASE_USER}:${DATABASE_PASSWORD}@localhost:${databasePort}/${DATABASE_NAME}`;
const childEnvironment = {
	...process.env,
	BETTER_AUTH_URL: `http://localhost:${appPort}`,
	DATABASE_URL: databaseUrl,
	UQ_COMPOSE_PROJECT: composeProject,
	UQ_DB_PORT: String(databasePort),
};

switch (command) {
	case "db:up":
		await startDatabase();
		break;
	case "db:down":
		await run(["docker", "compose", "down"]);
		break;
	case "dev":
		await startVite();
		break;
	case "dev:setup":
		await startDatabase();
		await waitForDatabase();
		await run(["bun", "run", "db:migrate"]);
		await startVite();
		break;
	default:
		throw new Error("Expected one of: db:up, db:down, dev, dev:setup");
}

function readPort(flags: readonly string[], fallback: number): number {
	const flagIndex = cliArgs.findIndex((value) => flags.includes(value));
	const rawValue = flagIndex === -1 ? String(fallback) : cliArgs[flagIndex + 1];
	const value = Number(rawValue);

	if (!Number.isInteger(value) || value < 1 || value > 65535) {
		throw new Error(`Invalid port for ${flags.join("/")}: ${rawValue}`);
	}

	return value;
}

async function startDatabase(): Promise<void> {
	await run(["docker", "compose", "up", "-d", "postgres"]);
}

async function waitForDatabase(): Promise<void> {
	for (let attempt = 0; attempt < 30; attempt += 1) {
		const process = Bun.spawn(
			[
				"docker",
				"compose",
				"exec",
				"-T",
				"postgres",
				"pg_isready",
				"-U",
				DATABASE_USER,
			],
			{
				cwd: workspacePath,
				env: childEnvironment,
				stdout: "ignore",
				stderr: "ignore",
			},
		);

		if ((await process.exited) === 0) {
			return;
		}

		await Bun.sleep(500);
	}

	throw new Error(`Postgres did not become healthy on port ${databasePort}`);
}

async function startVite(): Promise<void> {
	await run(["bun", "x", "vite", "dev", "--port", String(appPort)]);
}

async function run(args: readonly string[]): Promise<void> {
	const process = Bun.spawn([...args], {
		cwd: workspacePath,
		env: childEnvironment,
		stdin: "inherit",
		stdout: "inherit",
		stderr: "inherit",
	});
	const exitCode = await process.exited;

	if (exitCode !== 0) {
		throw new Error(`${args.join(" ")} exited with code ${exitCode}`);
	}
}
