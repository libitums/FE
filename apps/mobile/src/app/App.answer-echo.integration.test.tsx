import { afterEach, describe, expect, test, vi } from "vitest";
import { screen } from "@lynx-js/react/testing-library";

import { passAnswerEchoDelay } from "../lib/question-audio.test-support";
import type { CatalogLessonPlan } from "./catalog-lesson-plan";
import { withLevel5ItemAudioIds } from "./test-helpers/item-audio-content";
import { bootItemAudioApp, itemAudioUrl, lessonPlanWith } from "./test-helpers/item-audio-harness";
import {
  contentIdOf,
  resetApp,
  sentenceChipId,
  tapCheck,
  tapChoice,
  tapId,
  tapNode,
} from "./test-helpers/episode-format-harness";
import { solveActivity } from "./test-helpers/episode-format-solvers";

// 수준 5 모양 사본입니다 — 정답 뒤 음성 다섯 유형의 id가 `feedback.audio_url`에 있고 `stimulus.audio_url`은 없습니다(운영
// level-5판, ADR-0172). 듣기 유형은 지금처럼 `stimulus.audio_url`입니다. 대화 줄의 음성 id(`d-01` …)는 고정본 그대로입니다.
vi.mock("../lib/episode-bundled", async () => {
  const original = await import("../lib/episode-bundled.test-support");
  const { bundledCatalogInput } = original;
  const episodeId = "u01-water";
  return {
    ...original,
    bundledCatalogInput: {
      ...bundledCatalogInput,
      episodes: {
        ...bundledCatalogInput.episodes,
        [episodeId]: withLevel5ItemAudioIds(bundledCatalogInput.episodes[episodeId], episodeId),
      },
    },
  };
});

// `integration` 계층: 정답 뒤 음성(ADR-0172)이 레슨 route를 지나 호스트 재생 모듈에 닿는 경로 — 수준 5의 정답 음성 자리,
// 자기 음성이 없는 문항의 녹음 찾기, 판정 효과음 뒤의 틈, 다음 문항에서의 정지. 대역은 경계뿐입니다(`NativeModules` ·
// `fetch` · env). 카탈로그 · 계획 · 화면은 실물입니다.

afterEach(() => {
  vi.useRealTimers();
  resetApp();
});

const u01 = "u01-water";
const dialogueAudioUrl = (seq: string): string => `file:///c/audio/${u01}/d-${seq}.m4a`;

/** 그 문항이 몇 번째 활동의 몇 번째 문항인지입니다. */
function positionOf(
  plan: CatalogLessonPlan,
  itemId: string,
): { activity: number; question: number } {
  for (const [activity, refs] of plan.itemRefs.entries()) {
    const question = refs.findIndex((ref) => ref.itemId === itemId);
    if (question >= 0) return { activity, question };
  }
  throw new Error(`문항이 없다: ${itemId}`);
}

/** 단어 선택 활동의 `question`번째 문항 앞까지 정답으로 풀고 넘깁니다. */
function answerWordChoicesBefore(
  plan: CatalogLessonPlan,
  activity: number,
  question: number,
): void {
  plan.activities.slice(0, activity).forEach((done) => solveActivity(done, true, false));
  const current = plan.activities[activity];
  if (current?.form !== "word-choice") throw new Error(`단어 선택이 아니다: ${current?.form}`);
  expect(screen.getByTestId(contentIdOf["word-choice"])).toBeInTheDocument();
  for (const before of current.questions.slice(0, question)) {
    tapChoice(before.answerIndex);
    tapId("learning-shell-advance");
  }
}

describe("정답 뒤 음성 — 수준 5 · 녹음 찾기 · 틈 · 정지", () => {
  test("AE1. 수준 5 WORD_ORDER는 feedback.audio_url의 정답 음성을 확인 뒤 틈을 두고 한 번 재생한다", async () => {
    const { host } = await bootItemAudioApp({
      progress: { [u01]: ["intro", "S1", "S2", "S3", "S4", "S5"] },
    });
    const plan = lessonPlanWith(u01, "S6");
    tapNode(u01, "S6");
    const at = plan.activities.findIndex((activity) => activity.form === "sentence-order");
    plan.activities.slice(0, at).forEach((done) => solveActivity(done, true, false));
    const activity = plan.activities[at];
    if (activity?.form !== "sentence-order") throw new Error("문장 순서가 없다");
    const question = activity.questions[0];
    if (question === undefined) throw new Error("문항이 없다");
    const itemId = plan.itemRefs[at]?.[0]?.itemId ?? "";
    expect(itemId).toMatch(/^S6-/);
    vi.useFakeTimers();
    const before = host.play.mock.calls.length;

    for (const chip of question.answerOrder) tapId(sentenceChipId(question, chip));
    tapCheck();
    expect(host.play.mock.calls.length).toBe(before);
    passAnswerEchoDelay();

    expect(host.play.mock.calls.length).toBe(before + 1);
    expect(host.play.mock.calls.at(-1)?.[0]).toBe(itemAudioUrl(u01, itemId));
  });

  test("AE2. 자기 음성이 없는 CLOZE는 정답 문장의 대화 녹음을 틈을 두고 한 번 재생한다", async () => {
    const { host } = await bootItemAudioApp({ progress: { [u01]: ["intro"] } });
    const plan = lessonPlanWith(u01, "S1");
    const { activity, question } = positionOf(plan, "S1-08");
    tapNode(u01, "S1");
    answerWordChoicesBefore(plan, activity, question);
    const target = plan.activities[activity]?.questions[question] as { answerIndex: number };
    vi.useFakeTimers();
    const before = host.play.mock.calls.length;

    tapChoice(target.answerIndex);
    // ⟨ADR-0188⟩ 누른 빈칸 조각(낱말)에 녹음이 있으면 그 칩 소리가 먼저 납니다 — 정답 뒤 음성은 틈 뒤 한 번 그대로입니다.
    const afterTap = host.play.mock.calls.length;
    const chip = (target as { choiceAudio?: readonly (string | null)[] }).choiceAudio?.[
      target.answerIndex
    ];
    const chipPlays = chip == null || chip === dialogueAudioUrl("04") ? 0 : 1;
    expect(afterTap).toBe(before + chipPlays);
    if (chipPlays === 1) expect(host.play.mock.calls[afterTap - 1]?.[0]).toBe(chip);
    passAnswerEchoDelay();

    // 「카드로 할게요.」 — 대화 4번 줄의 녹음입니다.
    expect(host.play.mock.calls.length).toBe(afterTap + 1);
    expect(host.play.mock.calls.at(-1)?.[0]).toBe(dialogueAudioUrl("04"));
  });

  test("AE3. ROLE_LINE · REPLY_SELECT도 정답 대사의 녹음을 재생하고, 대답 고르기는 상대 말 듣기가 먼저다", async () => {
    const { host } = await bootItemAudioApp({ progress: { [u01]: ["intro", "S1"] } });
    const plan = lessonPlanWith(u01, "S2");
    const reply = positionOf(plan, "S2-05");
    tapNode(u01, "S2");
    answerWordChoicesBefore(plan, reply.activity, reply.question);
    const replyQuestion = plan.activities[reply.activity]?.questions[reply.question] as {
      answerIndex: number;
    };
    expect(host.play.mock.calls.at(-1)?.[0]).toBe(itemAudioUrl(u01, "S2-05"));
    vi.useFakeTimers();
    const before = host.play.mock.calls.length;

    tapChoice(replyQuestion.answerIndex);
    passAnswerEchoDelay();

    // 「카드로 할게요.」 — 대화 4번 줄입니다.
    expect(host.play.mock.calls.length).toBe(before + 1);
    expect(host.play.mock.calls.at(-1)?.[0]).toBe(dialogueAudioUrl("04"));

    tapId("learning-shell-advance");
    const roleLine = positionOf(plan, "S2-06");
    expect(roleLine.activity).toBe(reply.activity);
    expect(roleLine.question).toBe(reply.question + 1);
    const roleQuestion = plan.activities[roleLine.activity]?.questions[roleLine.question] as {
      answerIndex: number;
    };
    const beforeRole = host.play.mock.calls.length;

    tapChoice(roleQuestion.answerIndex);
    passAnswerEchoDelay();

    // 「따뜻한 물 주세요.」 — 대화 8번 줄입니다.
    expect(host.play.mock.calls.length).toBe(beforeRole + 1);
    expect(host.play.mock.calls.at(-1)?.[0]).toBe(dialogueAudioUrl("08"));
  });

  test("AE4. 틈 안에 다음 문항으로 넘기면 그 정답 음성은 나지 않고, 재생된 뒤 넘기면 멈춘다", async () => {
    const { host } = await bootItemAudioApp({ progress: { [u01]: ["intro", "S1"] } });
    const plan = lessonPlanWith(u01, "S2");
    const reply = positionOf(plan, "S2-05");
    tapNode(u01, "S2");
    answerWordChoicesBefore(plan, reply.activity, reply.question);
    const questions = plan.activities[reply.activity]?.questions as readonly {
      answerIndex: number;
    }[];
    vi.useFakeTimers();
    const before = host.play.mock.calls.length;

    tapChoice(questions[reply.question]?.answerIndex ?? -1);
    tapId("learning-shell-advance");
    passAnswerEchoDelay();

    expect(host.play.mock.calls.slice(before).map((call) => call[0])).not.toContain(
      dialogueAudioUrl("04"),
    );

    tapChoice(questions[reply.question + 1]?.answerIndex ?? -1);
    passAnswerEchoDelay();
    expect(host.play.mock.calls.at(-1)?.[0]).toBe(dialogueAudioUrl("08"));
    const stops = host.stop.mock.calls.length;

    tapId("learning-shell-advance");

    expect(host.stop.mock.calls.length).toBeGreaterThan(stops);
  });
});
