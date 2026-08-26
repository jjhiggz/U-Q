import { Effect } from "effect";
import type {
	I__AdjustBananaStickersInput,
	I__AdjustSongPointsInput,
	I__SubmitSongInput,
	I__UpdateSongInput,
} from "../song-queue.schema";
import { annotateOperation } from "@/server/effect/runtime";
import { Svc__Songs } from "./songs.service";

export const getSongsOperation = () =>
	Effect.gen(function* () {
		const service = yield* Svc__Songs;
		return yield* service.listActive();
	}).pipe((effect) => annotateOperation({ name: "songs.listActive", effect }));

export const getArchivedSongsOperation = () =>
	Effect.gen(function* () {
		const service = yield* Svc__Songs;
		return yield* service.listArchived();
	}).pipe((effect) =>
		annotateOperation({ name: "songs.listArchived", effect }),
	);

export const submitSongOperation = (input: I__SubmitSongInput) =>
	Effect.gen(function* () {
		const service = yield* Svc__Songs;
		return yield* service.submit(input);
	}).pipe((effect) => annotateOperation({ name: "songs.submit", effect }));

export const updateSongOperation = (input: I__UpdateSongInput) =>
	Effect.gen(function* () {
		const service = yield* Svc__Songs;
		return yield* service.update(input);
	}).pipe((effect) => annotateOperation({ name: "songs.update", effect }));

export const deleteSongOperation = (id: number) =>
	Effect.gen(function* () {
		const service = yield* Svc__Songs;
		return yield* service.delete(id);
	}).pipe((effect) => annotateOperation({ name: "songs.delete", effect }));

export const archiveSongOperation = (id: number) =>
	Effect.gen(function* () {
		const service = yield* Svc__Songs;
		return yield* service.archive(id);
	}).pipe((effect) => annotateOperation({ name: "songs.archive", effect }));

export const clearSongsOperation = () =>
	Effect.gen(function* () {
		const service = yield* Svc__Songs;
		return yield* service.clear();
	}).pipe((effect) => annotateOperation({ name: "songs.clear", effect }));

export const adjustSongPointsOperation = (input: I__AdjustSongPointsInput) =>
	Effect.gen(function* () {
		const service = yield* Svc__Songs;
		return yield* service.adjustPoints(input);
	}).pipe((effect) =>
		annotateOperation({ name: "songs.adjustPoints", effect }),
	);

export const adjustBananaStickersOperation = (
	input: I__AdjustBananaStickersInput,
) =>
	Effect.gen(function* () {
		const service = yield* Svc__Songs;
		return yield* service.adjustBananaStickers(input);
	}).pipe((effect) =>
		annotateOperation({ name: "songs.adjustBananaStickers", effect }),
	);
