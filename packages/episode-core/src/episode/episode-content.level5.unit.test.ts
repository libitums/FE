import { expect, test } from "vitest";

import { decodeEpisode, type Episode } from "./index";
import { item, minimalEpisode, roleplayTurnWire } from "./episode-wire.test-support";

// `unit` 계층: 콘텐츠 수준 5(ADR-0137) — staging 2026-11-10판이 새로 싣는 모양.
// `why_wrong` 객체 · TURN_ORDER의 빈 `context` · 음절 조각 RP의 빠진 `tiles_gloss`.

function decoded(items: Record<string, unknown>[]): Episode {
  const result = decodeEpisode(minimalEpisode({}, items));
  if (!result.ok) throw new Error(`fail: ${JSON.stringify(result.errors)}`);
  return result.episode;
}

const firstItem = (episode: Episode) => episode.units[0]?.items[0];

function listenWith(whyWrong: unknown): Record<string, unknown> {
  return item("LISTEN_SELECT", "S1-01", {
    options: [
      { id: "o1", ko: "맞음", roman: "majeum", correct: true },
      { id: "o2", ko: "틀림", roman: "teullim", correct: false, why_wrong: whyWrong },
    ],
  });
}

const wrongOption = (episode: Episode) => {
  const target = firstItem(episode);
  return target !== undefined && "options" in target ? target.options?.[1] : undefined;
};

test("L1. why_wrong 객체 {ko, en}을 받으면 whyWrong은 한국어, whyWrongEn은 영어다", () => {
  const episode = decoded([listenWith({ ko: "뜻이 달라요.", en: "Different meaning." })]);
  expect(wrongOption(episode)).toMatchObject({
    whyWrong: "뜻이 달라요.",
    whyWrongEn: "Different meaning.",
  });
});

test("L2. why_wrong 문자열은 지금처럼 whyWrong만 채운다", () => {
  const option = wrongOption(decoded([listenWith("이 자리에 맞는 말이 아니다")]));
  expect(option?.whyWrong).toBe("이 자리에 맞는 말이 아니다");
  expect(option).not.toHaveProperty("whyWrongEn");
});

test("L3. en이 없는 why_wrong 객체는 whyWrongEn 키를 만들지 않는다", () => {
  const option = wrongOption(decoded([listenWith({ ko: "뜻이 달라요." })]));
  expect(option?.whyWrong).toBe("뜻이 달라요.");
  expect(option).not.toHaveProperty("whyWrongEn");
});

const turnOrder = (extra: Record<string, unknown>) =>
  item("TURN_ORDER", "S3-02", {
    prompt: { ko: "대화 순서대로 놓으세요.", en: "Put the conversation in order." },
    ...extra,
  });

test("L4. TURN_ORDER의 context가 null이면 prompt의 글로 채운다", () => {
  const target = firstItem(decoded([turnOrder({ context: null })]));
  expect(target).toMatchObject({
    type: "TURN_ORDER",
    context: { ko: "대화 순서대로 놓으세요.", en: "Put the conversation in order." },
  });
});

test("L5. TURN_ORDER에 context 키가 없어도 prompt의 글로 채운다", () => {
  const wire = turnOrder({});
  delete wire.context;
  const target = firstItem(decoded([wire]));
  expect(target).toMatchObject({
    context: { ko: "대화 순서대로 놓으세요.", en: "Put the conversation in order." },
  });
});

test("L6. TURN_ORDER의 context가 있으면 그 값을 쓴다", () => {
  const target = firstItem(decoded([turnOrder({ context: { ko: "문맥", roman: "munmaek" } })]));
  expect(target).toMatchObject({ context: { ko: "문맥", roman: "munmaek" } });
});

test("L7. 음절 조각 RP처럼 tiles_gloss가 없으면 tilesGloss는 빈 배열이다", () => {
  const wire = roleplayTurnWire("RP-09");
  wire.roleplay = { line_id: "D1", tiles_kind: "syllable" };
  const target = firstItem(decoded([wire]));
  expect(target).toMatchObject({
    type: "ROLEPLAY_TURN",
    roleplay: { lineId: "D1", tilesGloss: [] },
  });
});

test("L8. why_wrong이 문자열도 {ko} 객체도 아니면 지금처럼 디코드에 실패한다", () => {
  expect(decodeEpisode(minimalEpisode({}, [listenWith(3)])).ok).toBe(false);
  expect(decodeEpisode(minimalEpisode({}, [listenWith({ en: "no ko" })])).ok).toBe(false);
});
