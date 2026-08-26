import { describe, expect, it } from "vitest";
import ts from "typescript";
import { declarativeBranching } from "./declarative-branching.ts";

function lint(code: string, fileName = "test.tsx") {
	const sourceFile = ts.createSourceFile(
		fileName,
		code,
		ts.ScriptTarget.ESNext,
		true,
		ts.ScriptKind.TSX,
	);
	return declarativeBranching().check(sourceFile, ts);
}

describe("declarative-branching", () => {
	it("is enabled automatically for page files", () => {
		const result = lint(
			`function C_Page__Demo() { if (status === "ready") return null; return null; }`,
			"/repo/src/features/demo/demo.page.tsx",
		);

		expect(result).toHaveLength(1);
	});
	it("does not run unless the file opts in", () => {
		const result = lint(`function run() { if (value) return; }`);

		expect(result).toHaveLength(0);
	});

	it("flags if statements outside imperative functions", () => {
		const result = lint(`// lint-enable: declarative-branching
function run() {
  if (value) return;
}`);

		expect(result).toHaveLength(1);
		expect(result[0].rule).toBe("declarative-branching");
		expect(result[0].message).toContain("Avoid if statements");
	});

	it("allows simple runtime guards inside imperative functions", () => {
		const result = lint(`// lint-enable: declarative-branching
/** @imperative */
function focusInput(input: HTMLInputElement | null) {
  if (input === null) return;
  input.focus();
}`);

		expect(result).toHaveLength(0);
	});

	it("allows throwing guard exits inside imperative functions", () => {
		const result = lint(`// lint-enable: declarative-branching
/** @imperative */
function parseRequiredValue(value: string | null) {
  if (value === null) {
    throw new Error("Missing value");
  }
  return value;
}`);

		expect(result).toHaveLength(0);
	});

	it("flags non-exiting if statements inside imperative functions", () => {
		const result = lint(`// lint-enable: declarative-branching
/** @imperative */
function handleOpenChange(isOpen: boolean) {
  if (!isOpen) {
    closeDialog();
  }
  syncState();
}`);

		expect(result).toHaveLength(1);
		expect(result[0].message).toContain("guard exits");
	});

	it("flags nested if statements inside imperative functions", () => {
		const result = lint(`// lint-enable: declarative-branching
/** @imperative */
function run(value: string | null, canRun: boolean) {
  if (value !== null) {
    if (canRun) doThing();
  }
}`);

		expect(result).toHaveLength(1);
		expect(result[0].message).toContain("Nested imperative if");
	});

	it("flags domain branching inside imperative functions", () => {
		const result = lint(`// lint-enable: declarative-branching
/** @imperative */
function run(target: { entityType: "menu" | "item" }) {
  if (target.entityType === "menu") doThing();
}`);

		expect(result).toHaveLength(1);
		expect(result[0].message).toContain("domain/state branching");
	});

	it("allows if statements inside imperative Effect.gen callbacks", () => {
		const result = lint(`// lint-enable: declarative-branching
const effect = Effect.gen(
  /** @imperative */
  function* () {
    if (value === null) return yield* Effect.fail(error);
    return value;
  },
);`);

		expect(result).toHaveLength(0);
	});

	it("allows simple boolean visibility in JSX children", () => {
		const result = lint(`// lint-enable: declarative-branching
function Component() {
  return <div>{isReady && <span />}</div>;
}`);

		expect(result).toHaveLength(0);
	});

	it("flags compound boolean branching in JSX children", () => {
		const result = lint(`// lint-enable: declarative-branching
function Component() {
  return <div>{isReady && hasAccess && <span />}</div>;
}`);

		expect(result).toHaveLength(1);
		expect(result[0].message).toContain("inline JSX boolean branching");
	});

	it("allows boolean expressions in JSX attributes", () => {
		const result = lint(`// lint-enable: declarative-branching
function Component() {
  return <Dialog onOpenChange={(isOpen) => !isOpen && close()} />;
}`);

		expect(result).toHaveLength(0);
	});

	it("allows nested attribute booleans inside simple boolean visibility", () => {
		const result = lint(`// lint-enable: declarative-branching
function Component() {
  return (
    <div>
      {hasNextPage && (
        <Button className={cn("size-4", isLoading && "animate-spin")}>
          Load more
        </Button>
      )}
    </div>
  );
}`);

		expect(result).toHaveLength(0);
	});

	it("allows inline match expressions in JSX", () => {
		const result = lint(`// lint-enable: declarative-branching
function Component() {
  return (
    <div>
      {match(status)
        .with("loading", () => <Spinner />)
        .with("ready", () => <Content />)
        .exhaustive()}
    </div>
  );
}`);

		expect(result).toHaveLength(0);
	});

	it("flags single boolean match outside JSX", () => {
		const result = lint(`// lint-enable: declarative-branching
const label = match(isOpen)
  .with(true, () => "Open")
  .with(false, () => "Closed")
  .exhaustive();`);

		expect(result).toHaveLength(1);
		expect(result[0].message).toContain("single boolean");
	});

	it("flags property boolean match outside JSX", () => {
		const result = lint(`// lint-enable: declarative-branching
const className = match(mediaQuery.isFetchingNextPage)
  .with(true, () => "animate-spin")
  .with(false, () => undefined)
  .exhaustive();`);

		expect(result).toHaveLength(1);
		expect(result[0].message).toContain("single boolean");
	});

	it("allows multi-fact object match outside JSX", () => {
		const result = lint(`// lint-enable: declarative-branching
const viewState = match({ isLoading, hasItems })
  .with({ isLoading: true }, () => "loading")
  .with({ isLoading: false, hasItems: false }, () => "empty")
  .with({ isLoading: false, hasItems: true }, () => "ready")
  .exhaustive();`);

		expect(result).toHaveLength(0);
	});

	it("allows single boolean match inside JSX", () => {
		const result = lint(`// lint-enable: declarative-branching
function Component() {
  return (
    <div>
      {match(isOpen)
        .with(true, () => <Open />)
        .with(false, () => <Closed />)
        .exhaustive()}
    </div>
  );
}`);

		expect(result).toHaveLength(0);
	});
});
