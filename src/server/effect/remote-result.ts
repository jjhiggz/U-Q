export interface I__RemoteFailure {
	readonly _tag: string;
	readonly message: string;
}

export type RemoteFailure<E extends I__RemoteFailure> =
	E extends I__RemoteFailure
		? {
				readonly _tag: E["_tag"];
				readonly message: E["message"];
			} & {
				readonly [K in keyof E as K extends string
					? K extends keyof Error | "_tag" | "pipe"
						? never
						: E[K] extends (...args: never[]) => unknown
							? never
							: K
					: never]: E[K];
			}
		: never;

export type RemoteResult<A, E extends I__RemoteFailure> =
	| { readonly _tag: "Success"; readonly value: A }
	| { readonly _tag: "Failure"; readonly error: RemoteFailure<E> };

export type RemoteError<E extends I__RemoteFailure> = Error & RemoteFailure<E>;

export function unwrapRemoteResult<A, E extends I__RemoteFailure>(
	result: RemoteResult<A, E>,
): A {
	if (result._tag === "Success") {
		return result.value;
	}

	throw Object.assign(
		new Error(result.error.message),
		result.error,
	) as RemoteError<E>;
}
