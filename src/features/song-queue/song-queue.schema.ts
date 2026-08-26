import { z } from "zod";

const S__OptionalUrl = z.string().trim().url().optional();

export const S__SubmitSongInput = z
	.object({
		title: z.string().trim().min(1).max(255),
		artist: z.string().trim().min(1).max(255),
		nameInChat: z.string().trim().max(100).optional(),
		notes: z.string().trim().optional(),
		genres: z.string().trim().max(500).optional(),
		songLink: S__OptionalUrl,
		youtubeUrl: S__OptionalUrl,
		soundcloudUrl: S__OptionalUrl,
		instagramUrl: S__OptionalUrl,
		tiktokUrl: S__OptionalUrl,
		facebookUrl: S__OptionalUrl,
	})
	.superRefine((input, context) => {
		validateHost(input.songLink, "songLink", context, {
			blocked: [
				"music.apple.com",
				"itunes.apple.com",
				"tidal.com",
				"deezer.com",
				"amazon.com",
				"music.amazon.com",
			],
			message: "Use a link from a free streaming service.",
		});
		validateHost(input.youtubeUrl, "youtubeUrl", context, {
			allowed: ["youtube.com", "youtu.be"],
			message: "Enter a valid YouTube URL.",
		});
		validateHost(input.soundcloudUrl, "soundcloudUrl", context, {
			allowed: ["soundcloud.com"],
			message: "Enter a valid SoundCloud URL.",
		});
		validateHost(input.instagramUrl, "instagramUrl", context, {
			allowed: ["instagram.com", "instagr.am"],
			message: "Enter a valid Instagram URL.",
		});
		validateHost(input.tiktokUrl, "tiktokUrl", context, {
			allowed: ["tiktok.com"],
			message: "Enter a valid TikTok URL.",
		});
		validateHost(input.facebookUrl, "facebookUrl", context, {
			allowed: ["facebook.com", "fb.com", "fb.watch"],
			message: "Enter a valid Facebook URL.",
		});
	});

export type I__SubmitSongInput = z.infer<typeof S__SubmitSongInput>;

export const S__SongIdInput = z.object({ id: z.number().int().positive() });
export type I__SongIdInput = z.infer<typeof S__SongIdInput>;

export const S__AdjustSongPointsInput = S__SongIdInput.extend({
	points: z.number().int(),
});
export type I__AdjustSongPointsInput = z.infer<typeof S__AdjustSongPointsInput>;

export const S__AdjustBananaStickersInput = S__SongIdInput.extend({
	delta: z.number().int(),
});
export type I__AdjustBananaStickersInput = z.infer<
	typeof S__AdjustBananaStickersInput
>;

export const S__UpdateSongInput = S__SubmitSongInput.safeExtend({
	id: z.number().int().positive(),
});
export type I__UpdateSongInput = z.infer<typeof S__UpdateSongInput>;

function validateHost(
	value: string | undefined,
	path: keyof I__SubmitSongInput,
	context: z.RefinementCtx,
	rule: {
		readonly allowed?: readonly string[];
		readonly blocked?: readonly string[];
		readonly message: string;
	},
): void {
	if (!value) return;

	const hostname = new URL(value).hostname.toLowerCase();
	const matches = (domain: string) =>
		hostname === domain || hostname.endsWith(`.${domain}`);
	const invalid = rule.allowed
		? !rule.allowed.some(matches)
		: rule.blocked?.some(matches) === true;

	if (invalid) {
		context.addIssue({ code: "custom", path: [path], message: rule.message });
	}
}
