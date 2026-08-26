import { runLint, formatDiagnostics } from "./runner.ts";
import { noLongTernary } from "./rules/no-long-ternary.ts";
import { noAsCast } from "./rules/no-as-cast.ts";
import { noTypePredicate } from "./rules/no-type-predicate.ts";
import { noImperativeLoops } from "./rules/no-imperative-loops.ts";
import { noSwitchStatement } from "./rules/no-switch-statement.ts";
import { noTryCatch } from "./rules/no-try-catch.ts";
import { noDirectQueryHooks } from "./rules/no-direct-query-hooks.ts";
import { noAnchorElement } from "./rules/no-anchor-element.ts";
import { noArrayMutation } from "./rules/no-array-mutation.ts";
import { preferObjectParams } from "./rules/prefer-object-params.ts";
import { noUiImportsInRoutesOrPages } from "./rules/no-ui-imports-in-routes-or-pages.ts";
import { noCrossFeatureInternalImports } from "./rules/no-cross-feature-internal-imports.ts";
import { componentPropsInterfaceName } from "./rules/component-props-interface-name.ts";
import { frontendArchitecturePaths } from "./rules/frontend-architecture-paths.ts";
import { noJsxInRoutes } from "./rules/no-jsx-in-routes.ts";
import { noUnnecessaryIndexFiles } from "./rules/no-unnecessary-index-files.ts";
import { seedNamingConventions } from "./rules/seed-naming-conventions.ts";
import { sharedSchemaNamingConventions } from "./rules/shared-schema-naming-conventions.ts";
import { sqlWhereExpressionNaming } from "./rules/sql-where-expression-naming.ts";
import { declarativeBranching } from "./rules/declarative-branching.ts";
import { noTrivialProxyFunction } from "./rules/no-trivial-proxy-function.ts";
import { noProductJsonDbColumns } from "./rules/no-product-json-db-columns.ts";
import { architectureBoundaries } from "./rules/architecture-boundaries.ts";
import {
	findRepeatedPermissionCapabilityLogic,
	formatPermissionCapabilityLogicReport,
} from "./dedupe/permission-capability-logic.ts";
import {
	findRepeatedErrorMappings,
	formatErrorMappingReport,
} from "./dedupe/error-mapping.ts";
import {
	findRepeatedClosedLookupTables,
	formatClosedLookupTablesReport,
} from "./dedupe/closed-lookup-tables.ts";

const patterns = ["src/**/*.ts", "src/**/*.tsx"];

// Exclude patterns (regex applied to file paths)
const excludePatterns = [
	/\.gen\./, // Generated files
	/\/components\/ui\//, // shadcn/ui components (read-only)
];

const rules = [
	noLongTernary(),
	noAsCast(),
	noTypePredicate(),
	noImperativeLoops(),
	noSwitchStatement(),
	noTryCatch(),
	noDirectQueryHooks(),
	noAnchorElement(),
	noArrayMutation(),
	preferObjectParams(),
	noUiImportsInRoutesOrPages(),
	noCrossFeatureInternalImports(),
	componentPropsInterfaceName(),
	frontendArchitecturePaths(),
	noJsxInRoutes(),
	noUnnecessaryIndexFiles(),
	seedNamingConventions(),
	sharedSchemaNamingConventions(),
	sqlWhereExpressionNaming(),
	noTrivialProxyFunction(),
	declarativeBranching(),
	noProductJsonDbColumns(),
	architectureBoundaries(),
];

const DEDUPE_VIOLATION_NOTE =
	"If any violation looks like a bad signal, add `// ignore-rule <rule-name> -- <explanation>` on the line above and tell the user so we can re-examine that detector's constraint.";

const diagnostics = (await runLint(patterns, rules)).filter(
	(d) => !excludePatterns.some((p) => p.test(d.file)),
);

if (diagnostics.length > 0) {
	console.error(formatDiagnostics(diagnostics));
	console.error(`\n${diagnostics.length} lint error(s) found.`);
	process.exit(1);
}

const dedupeViolationReports = await getDedupeViolationReports();
if (dedupeViolationReports.length > 0) {
	console.error(
		`Custom lint dedupe violations:\n\n${dedupeViolationReports.join("\n\n")}\n\n${DEDUPE_VIOLATION_NOTE}`,
	);
	process.exit(1);
}

console.log("Custom lint rules: all clear.");

async function getDedupeViolationReports(): Promise<readonly string[]> {
	const permissionGroups =
		await findRepeatedPermissionCapabilityLogic(patterns);
	const errorMappingGroups = await findRepeatedErrorMappings(patterns);
	const closedLookupGroups = await findRepeatedClosedLookupTables(patterns);

	return [
		permissionGroups.length > 0
			? `● Repeated Permission/Capability Logic\n${formatPermissionCapabilityLogicReport(permissionGroups)}`
			: null,
		errorMappingGroups.length > 0
			? `● Repeated Error Mapping\n${formatErrorMappingReport(errorMappingGroups)}`
			: null,
		closedLookupGroups.length > 0
			? `● Repeated Closed Lookup Tables\n${formatClosedLookupTablesReport(closedLookupGroups)}`
			: null,
	].filter((report) => report !== null);
}
