import { readdir, readFile } from "node:fs/promises";
import { extname, join, relative } from "node:path";
import ts from "typescript";

interface I__Diagnostic {
	readonly column: number;
	readonly file: string;
	readonly line: number;
	readonly message: string;
	readonly rule: string;
}

const root = process.cwd();
const sourceRoot = join(root, "src");
const diagnostics: I__Diagnostic[] = [];

for (const file of await collectSourceFiles(sourceRoot)) {
	if (file.endsWith("routeTree.gen.ts")) continue;
	const source = ts.createSourceFile(
		file,
		await readFile(file, "utf8"),
		ts.ScriptTarget.Latest,
		true,
		file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
	);

	for (const statement of source.statements) {
		if (
			!ts.isImportDeclaration(statement) ||
			!ts.isStringLiteral(statement.moduleSpecifier)
		) {
			continue;
		}
		const moduleName = statement.moduleSpecifier.text;
		const names = statement.importClause?.namedBindings;
		const imports =
			names && ts.isNamedImports(names)
				? names.elements.map(
						(element) => element.propertyName?.text ?? element.name.text,
					)
				: [];

		if (
			moduleName === "@tanstack/react-query" &&
			!file.endsWith(".queries.ts") &&
			!file.endsWith("/lib/server-state.ts") &&
			imports.some((name) =>
				["useMutation", "useQuery", "useQueryClient"].includes(name),
			)
		) {
			report(
				source,
				statement,
				"no-direct-query-hooks",
				"Use a feature-owned *.queries.ts hook.",
			);
		}

		if (
			moduleName === "@tanstack/react-start" &&
			imports.includes("createServerFn") &&
			!file.endsWith(".functions.ts")
		) {
			report(
				source,
				statement,
				"no-direct-server-fn",
				"Keep server functions in feature *.functions.ts files and alias createServerFn as SF.",
			);
		}

		const repositoryFile = file.endsWith(".repository.ts");
		const databaseInfrastructure = file.includes("/server/database/");
		const authInfrastructure = file.includes("/server/auth/");
		if (
			(moduleName === "@/db" || moduleName === "drizzle-orm/node-postgres") &&
			!repositoryFile &&
			!databaseInfrastructure &&
			!authInfrastructure
		) {
			report(
				source,
				statement,
				"no-direct-database",
				"Access Drizzle through a repository or database infrastructure.",
			);
		}
	}
}

if (diagnostics.length > 0) {
	for (const diagnostic of diagnostics) {
		console.error(
			`${diagnostic.file}:${diagnostic.line}:${diagnostic.column} ${diagnostic.rule}: ${diagnostic.message}`,
		);
	}
	process.exit(1);
}

console.log("Custom architecture rules passed.");

async function collectSourceFiles(directory: string): Promise<string[]> {
	const entries = await readdir(directory, { withFileTypes: true });
	const files = await Promise.all(
		entries.map((entry) => {
			const path = join(directory, entry.name);
			return entry.isDirectory() ? collectSourceFiles(path) : [path];
		}),
	);
	return files.flat().filter((file) => [".ts", ".tsx"].includes(extname(file)));
}

function report(
	source: ts.SourceFile,
	node: ts.Node,
	rule: string,
	message: string,
): void {
	const position = source.getLineAndCharacterOfPosition(node.getStart(source));
	diagnostics.push({
		file: relative(root, source.fileName),
		line: position.line + 1,
		column: position.character + 1,
		rule,
		message,
	});
}
