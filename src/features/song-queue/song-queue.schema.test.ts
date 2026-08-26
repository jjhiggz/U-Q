import { describe, expect, it } from "vitest";
import { S__SubmitSongInput } from "./song-queue.schema";

const validSong = { title: "Loser", artist: "Beck" };

describe("S__SubmitSongInput", () => {
	it("accepts supported song and social links", () => {
		expect(
			S__SubmitSongInput.safeParse({
				...validSong,
				songLink: "https://open.spotify.com/track/123",
				youtubeUrl: "https://youtu.be/example",
			}).success,
		).toBe(true);
	});

	it("rejects paid-only streaming links", () => {
		const result = S__SubmitSongInput.safeParse({
			...validSong,
			songLink: "https://music.apple.com/us/album/example",
		});
		expect(result.success).toBe(false);
		expect(result.error?.issues[0]?.path).toEqual(["songLink"]);
	});

	it("rejects a social URL for the wrong host", () => {
		const result = S__SubmitSongInput.safeParse({
			...validSong,
			youtubeUrl: "https://example.com/video",
		});
		expect(result.success).toBe(false);
		expect(result.error?.issues[0]?.path).toEqual(["youtubeUrl"]);
	});
});
