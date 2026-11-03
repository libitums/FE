import { expect, test } from "vitest";

import type { LearningItem } from "../lib/episode-content.model";
import { fillPlaceholders } from "../lib/placeholder-fill";
import { catalogItemOf } from "./catalog-item-map";
import type { CatalogFill, CatalogLessonItemPort } from "./catalog-lesson-types";

// `unit` 계층: 빈칸 타자 입력(CLOZE_TYPING)은 패턴 쓰기와 같은 타자 문항이다 — 문장 뜻이 단서, 빈칸 문장이 힌트,
// 빈칸에 들어갈 말이 정답.

const fill: CatalogFill = (text, script) => fillPlaceholders(text, {}, script);
const port: CatalogLessonItemPort = {
  fill,
  episodeId: "u13-pajeon",
  glossOf: () => null,
  imageUrlOf: () => null,
  audioUrlOf: () => null,
};

const item = (extra: Partial<Record<string, unknown>> = {}): LearningItem =>
  ({
    id: "S6-04",
    type: "CLOZE_TYPING",
    event: "R",
    prompt: { ko: "빈칸을 채우세요.", en: "Fill in the blank." },
    context: { ko: "네, 두 ___ 주세요.", roman: "ne, du ___ juseyo.", en: "Yes, two please." },
    answers: [{ ko: "개", roman: "gae", en: "item (counter)" }],
    ...extra,
  }) as unknown as LearningItem;

test("CTM1. 패턴 타자 문항이 된다 — 단서는 문장 뜻, 힌트는 빈칸 문장, 정답은 빈칸 말", () => {
  const mapped = catalogItemOf(item(), port);
  expect(mapped.kind).toBe("typing");
  if (mapped.kind !== "typing") return;
  expect(mapped.question).toMatchObject({
    kind: "pattern",
    instruction: "Fill in the blank.",
    cue: "Yes, two please.",
    hint: "네, 두 ___ 주세요.",
    answers: ["개"],
  });
});

test("CTM2. 문장 뜻이 없으면 정답의 영어를 단서로, 둘 다 없으면 건너뛴다", () => {
  const noSentence = catalogItemOf(
    item({ context: { ko: "네, 두 ___ 주세요.", roman: "r" } }),
    port,
  );
  expect(noSentence.kind === "typing" && noSentence.question.cue).toBe("item (counter)");
  const none = catalogItemOf(
    item({
      context: { ko: "네, 두 ___ 주세요.", roman: "r" },
      answers: [{ ko: "개", roman: "gae" }],
    }),
    port,
  );
  expect(none).toMatchObject({ kind: "skipped", reason: "no-source" });
});

test("CTM3. 자판으로 칠 수 없는 정답(라틴 글자)은 건너뛴다", () => {
  const mapped = catalogItemOf(item({ answers: [{ ko: "BTS", roman: "BTS", en: "BTS" }] }), port);
  expect(mapped).toMatchObject({ kind: "skipped", reason: "untypeable" });
});
