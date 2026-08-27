import { createHash } from "node:crypto";
import {
	existsSync,
	mkdirSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { basename, resolve } from "node:path";

const DEFAULT_APP_PORT = 3000;
const DEFAULT_DB_PORT = 55432;
const DATABASE_USER = "musicqueue";
const DATABASE_PASSWORD = "musicqueue";
const DATABASE_NAME = "musicqueue";

type Command =
	| "db:down"
	| "db:down:all"
	| "db:up"
	| "dev"
	| "dev:down:all"
	| "dev:setup";

const command = Bun.argv[2] as Command | undefined;
const cliArgs = Bun.argv.slice(3);
const appPort = readPort(["-p", "--port"], DEFAULT_APP_PORT);
const databasePort = readPort(["-dbp", "--db-port"], DEFAULT_DB_PORT);
const workspacePath = resolve(import.meta.dir, "..");
const statePath = resolve(workspacePath, ".tmp", "local-dev");
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
	case "db:down:all":
		await stopAllDatabases();
		break;
	case "dev":
		await startVite();
		break;
	case "dev:down:all":
		await stopAllDevServers();
		await stopAllDatabases();
		break;
	case "dev:setup":
		await startDatabase();
		await waitForDatabase();
		await run(["bun", "run", "db:migrate"]);
		await run(["bun", "run", "db:seed"]);
		await startVite();
		break;
	default:
		throw new Error(
			"Expected one of: db:up, db:down, db:down:all, dev, dev:down:all, dev:setup",
		);
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
	mkdirSync(statePath, { recursive: true });
	await run(["bun", "x", "vite", "dev", "--port", String(appPort)], {
		onSpawn: (process) => {
			writeFileSync(
				resolve(statePath, `vite-${appPort}.pid`),
				String(process.pid),
			);
		},
	});
}

async function stopAllDatabases(): Promise<void> {
	const ids = await readLines([
		"docker",
		"ps",
		"-aq",
		"--filter",
		"label=com.uq.app=true",
	]);
	if (ids.length === 0) {
		console.log("No labeled UQ database containers found.");
		return;
	}

	await run(["docker", "rm", "-f", ...ids]);
}

async function stopAllDevServers(): Promise<void> {
	if (!existsSync(statePath)) {
		console.log("No UQ dev server pid files found.");
		return;
	}

	const pidFiles = await Array.fromAsync(
		new Bun.Glob("vite-*.pid").scan(statePath),
	);
	if (pidFiles.length === 0) {
		console.log("No UQ dev server pid files found.");
		return;
	}

	for (const pidFile of pidFiles) {
		const fullPath = resolve(statePath, pidFile);
		const pid = Number(readFileSync(fullPath, "utf8"));
		if (Number.isInteger(pid) && pid > 0) {
			try {
				process.kill(pid, "SIGTERM");
				console.log(`Stopped dev server pid ${pid}.`);
			} catch (error) {
				if (!isMissingProcessError(error)) {
					throw error;
				}
			}
		}
		rmSync(fullPath, { force: true });
	}
}

async function run(
	args: readonly string[],
	options?: {
		readonly onSpawn?: (
			process: Bun.Subprocess<"inherit", "inherit", "inherit">,
		) => void;
	},
): Promise<void> {
	const process = Bun.spawn([...args], {
		cwd: workspacePath,
		env: childEnvironment,
		stdin: "inherit",
		stdout: "inherit",
		stderr: "inherit",
	});
	options?.onSpawn?.(process);
	const exitCode = await process.exited;

	if (exitCode !== 0) {
		throw new Error(`${args.join(" ")} exited with code ${exitCode}`);
	}
}

async function readLines(args: readonly string[]): Promise<readonly string[]> {
	const process = Bun.spawn([...args], {
		cwd: workspacePath,
		env: childEnvironment,
		stdout: "pipe",
		stderr: "inherit",
	});
	const output = await new Response(process.stdout).text();
	const exitCode = await process.exited;
	if (exitCode !== 0) {
		throw new Error(`${args.join(" ")} exited with code ${exitCode}`);
	}

	return output
		.split("\n")
		.map((line) => line.trim())
		.filter(Boolean);
}

function isMissingProcessError(error: unknown): boolean {
	return (
		!!error &&
		typeof error === "object" &&
		"code" in error &&
		error.code === "ESRCH"
	);
}
