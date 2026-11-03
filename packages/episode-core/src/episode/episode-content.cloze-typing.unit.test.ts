import { expect, test } from "vitest";

import { decodeEpisode, type Episode } from "./index";
import { minimalEpisode } from "./episode-wire.test-support";

// `unit` 계층: 빈칸 타자 입력(CLOZE_TYPING, 2026-11-02 u11 ~ u13) — 빈칸 문장과 쓸 말.

const wire = {
  id: "S6-04",
  type: "CLOZE_TYPING",
  mode: "typing",
  event: "R",
  prompt: { ko: "빈칸을 채우세요.", en: "Fill in the blank." },
  context: { ko: "네, 두 ___ 주세요.", roman: "ne, du ___ juseyo.", en: "Yes, two please." },
  answers: [{ ko: "개", roman: "gae", en: "item (counter)" }],
};

function decoded(item: Record<string, unknown>): { episode: Episode; codes: string[] } {
  const result = decodeEpisode(minimalEpisode({}, [item]));
  if (!result.ok) throw new Error(`fail: ${JSON.stringify(result.errors)}`);
  return { episode: result.episode, codes: result.warnings.map((warning) => warning.code) };
}

test("CT1. 빈칸 문장 · 쓸 말을 도메인 문항으로 옮기고, 모르는 형식 경고가 없다", () => {
  const { episode, codes } = decoded(wire);
  expect(episode.units[0]?.items[0]).toMatchObject({
    id: "S6-04",
    type: "CLOZE_TYPING",
    prompt: { ko: "빈칸을 채우세요.", en: "Fill in the blank." },
    context: { ko: "네, 두 ___ 주세요.", roman: "ne, du ___ juseyo.", en: "Yes, two please." },
    answers: [{ ko: "개", roman: "gae", en: "item (counter)" }],
  });
  expect(codes).not.toContain("unknown-item-type");
});

test("CT2. 쓸 말이 없으면 에피소드가 디코드에 실패한다(모양 오류)", () => {
  const result = decodeEpisode(minimalEpisode({}, [{ ...wire, answers: [] }]));
  expect(result.ok).toBe(false);
});
