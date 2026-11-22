import { expect, test } from "vitest";

import { decodeEpisode, type Episode } from "./index";
import { item, minimalEpisode, type ItemType } from "./episode-wire.test-support";

// `unit` 계층: 콘텐츠 수준 5의 정답 음성 id(`feedback.audio_url`, ADR-0172). 수준 4까지는 같은 id가 `stimulus.audio_url`에
// 왔고, 수준 5판은 `feedback`으로 옮겨 실었습니다 — 디코더가 버리면 정답 뒤 음성이 조용해집니다.

function decoded(items: Record<string, unknown>[]): Episode {
  const result = decodeEpisode(minimalEpisode({}, items));
  if (!result.ok) throw new Error(`fail: ${JSON.stringify(result.errors)}`);
  return result.episode;
}

const firstItem = (episode: Episode) => episode.units[0]?.items[0];

const answerAudioTypes: readonly ItemType[] = [
  "IMG_MATCH",
  "WORD_ORDER",
  "TRANSLATE_TO_KO",
  "SYLLABLE_BUILD",
  "LISTEN_BUILD",
  "SPEAK_WORD",
  "SHADOW",
];

test.each(answerAudioTypes)("AA1. %s의 feedback.audio_url은 answerAudioUrl이 된다", (type) => {
  const target = firstItem(
    decoded([item(type, "S1-01", { feedback: { audio_url: "level-3/u03-mina/s1-11-ex" } })]),
  );
  expect(target).toMatchObject({ type, answerAudioUrl: "level-3/u03-mina/s1-11-ex" });
});

test.each(answerAudioTypes)("AA2. %s의 빈 feedback.audio_url은 키를 만들지 않는다", (type) => {
  const target = firstItem(decoded([item(type, "S1-01", { feedback: { audio_url: "" } })]));
  expect(target).not.toHaveProperty("answerAudioUrl");
});

test.each(answerAudioTypes)("AA3. %s에 feedback이 없는 옛 파일은 그대로 디코드된다", (type) => {
  const target = firstItem(decoded([item(type, "S1-01")]));
  expect(target).toMatchObject({ type });
  expect(target).not.toHaveProperty("answerAudioUrl");
});

test("AA4. 정답 음성 id는 stimulus.audioUrl을 바꾸지 않는다(두 자리는 따로 남는다)", () => {
  const target = firstItem(
    decoded([
      item("WORD_ORDER", "S1-01", {
        stimulus: { en: "I'm Australian.", audio_url: "u03-mina/old" },
        feedback: { audio_url: "u03-mina/new" },
      }),
    ]),
  );
  expect(target).toMatchObject({
    stimulus: { audioUrl: "u03-mina/old" },
    answerAudioUrl: "u03-mina/new",
  });
});
