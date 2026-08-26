import { describe, expect, it } from "vitest";
import { unwrapRemoteResult } from "./remote-result";

describe("unwrapRemoteResult", () => {
	it("returns successful output", () => {
		expect(unwrapRemoteResult({ _tag: "Success", value: { id: 42 } })).toEqual({
			id: 42,
		});
	});

	it("throws an Error that retains the tagged failure", () => {
		expect(() =>
			unwrapRemoteResult<
				never,
				{
					readonly _tag: "E__SongAlreadyQueued";
					readonly message: string;
					readonly songId: number;
				}
			>({
				_tag: "Failure",
				error: {
					_tag: "E__SongAlreadyQueued",
					message: "Already queued.",
					songId: 42,
				},
			}),
		).toThrow(
			expect.objectContaining({
				_tag: "E__SongAlreadyQueued",
				message: "Already queued.",
				songId: 42,
			}),
		);
	});
});
