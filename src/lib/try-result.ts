export type TryResult<A> =
	| { readonly _tag: "Success"; readonly value: A }
	| { readonly _tag: "Failure"; readonly error: unknown };

export async function tryAsync<A>(
	run: () => Promise<A>,
): Promise<TryResult<A>> {
	try {
		return { _tag: "Success", value: await run() };
	} catch (error) {
		return { _tag: "Failure", error };
	}
}

export function trySync<A>(run: () => A): TryResult<A> {
	try {
		return { _tag: "Success", value: run() };
	} catch (error) {
		return { _tag: "Failure", error };
	}
}
