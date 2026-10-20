import { describe, expect, test, vi } from "vitest";

import type { AudioTiming } from "../../lib/audio-manifest";
import type { EpisodeCut, Text } from "../../lib/episode-content.model";
import { fillPlaceholders } from "../../lib/placeholder-fill";
import { catalogCutViewsOf } from "./catalog-cover";
import type { CatalogCutPort } from "./catalog-cover.contract";

// `unit` 계층: 소리 있는 컷의 뷰에만 맞출 길이(voiceSyncMs)가 실리는지 봅니다.

const AUDIO_ID = "u01-water/pre-3";
const AUDIO_SOURCE = "https://cdn/audio/u01-water/pre-3.m4a";
const line: Text = { ko: "어서 오세요.", roman: "eoseo oseyo.", en: "Welcome." };

function portWith(
  timing: AudioTiming | null,
  imageUrlOf: CatalogCutPort["imageUrlOf"] = (path) => `https://cdn/${path}`,
) {
  const audioTimingOf = vi.fn<(id: string) => AudioTiming | null>(() => timing);
  const port: CatalogCutPort = {
    imageUrlOf,
    audioTimingOf,
    fill: (text, script) => fillPlaceholders(text, {}, script),
  };
  return { port, audioTimingOf };
}

const speech = (text: Text, audioUrl?: string): EpisodeCut => ({
  kind: "speech",
  index: 1,
  speaker: "점원",
  line: text,
  aside: { ko: "고개를 들며" },
  imageBrief: "brief",
  ...(audioUrl === undefined ? {} : { audioUrl }),
});
const narration = (audioUrl: string): EpisodeCut => ({
  kind: "narration",
  index: 1,
  narration: line,
  imageBrief: "brief",
  audioUrl,
});
const monologue = (audioUrl: string): EpisodeCut => ({
  kind: "monologue",
  index: 1,
  speaker: "플레이어",
  line,
  imageBrief: "brief",
  audioUrl,
});

describe("catalogCutViewsOf - voiceSyncMs", () => {
  test.each<[string, EpisodeCut]>([
    ["대사", speech(line, AUDIO_ID)],
    ["내레이션", narration(AUDIO_ID)],
    ["독백", monologue(AUDIO_ID)],
  ])("CCV1. %s 컷은 항목의 speech_end를 싣고 audioSource는 그대로다", (_name, cut) => {
    const { port, audioTimingOf } = portWith({ durationMs: 2299, speechEndMs: 1763 });
    const [view] = catalogCutViewsOf([cut], port);
    expect(view).toHaveProperty("voiceSyncMs", 1763);
    expect(view).toHaveProperty("audioSource", AUDIO_SOURCE);
    expect(audioTimingOf).toHaveBeenCalledWith(AUDIO_ID);
  });

  test("CCV1. speech_end가 없거나 duration보다 크면 duration을 싣는다", () => {
    const none = portWith({ durationMs: 1091 });
    expect(catalogCutViewsOf([speech(line, AUDIO_ID)], none.port)[0]).toHaveProperty(
      "voiceSyncMs",
      1091,
    );
    const over = portWith({ durationMs: 1000, speechEndMs: 1200 });
    expect(catalogCutViewsOf([speech(line, AUDIO_ID)], over.port)[0]).toHaveProperty(
      "voiceSyncMs",
      1000,
    );
  });

  test.each<[string, EpisodeCut, AudioTiming | null]>([
    ["항목 없음", speech(line, AUDIO_ID), null],
    ["소리 없는 컷", speech(line), { durationMs: 2299, speechEndMs: 1763 }],
    [
      "자리표시자 줄",
      speech({ ko: "{이름}(으)로 예약했어요." }, AUDIO_ID),
      { durationMs: 2299, speechEndMs: 1763 },
    ],
    ["규약 밖 id", speech(line, "../pre-3"), { durationMs: 2299, speechEndMs: 1763 }],
  ])("CCV2. %s이면 voiceSyncMs 키가 없다", (_name, cut, timing) => {
    const { port } = portWith(timing);
    const [view] = catalogCutViewsOf([cut], port);
    expect(view).toBeDefined();
    expect(view !== undefined && "voiceSyncMs" in view).toBe(false);
  });

  test("CCV2. 소리 주소가 없으면(imageUrlOf가 null) 항목이 있어도 싣지 않고 조회하지 않는다", () => {
    const { port, audioTimingOf } = portWith({ durationMs: 2299, speechEndMs: 1763 }, () => null);
    const [view] = catalogCutViewsOf([speech(line, AUDIO_ID)], port);
    expect(view !== undefined && "voiceSyncMs" in view).toBe(false);
    expect(audioTimingOf).not.toHaveBeenCalled();
  });
});
