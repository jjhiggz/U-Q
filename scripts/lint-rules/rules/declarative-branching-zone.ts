import { existsSync } from "node:fs";
import { dirname, join } from "node:path";

const ZONE_FILE_NAME = ".declarative-branching-zone";

export function isInDeclarativeBranchingZone(filePath: string): boolean {
	let currentDir = dirname(filePath);

	while (currentDir !== "." && currentDir !== "/") {
		if (existsSync(join(currentDir, ZONE_FILE_NAME))) return true;

		const nextDir = dirname(currentDir);
		if (nextDir === currentDir) return false;
		currentDir = nextDir;
	}

	return existsSync(join(currentDir, ZONE_FILE_NAME));
}
