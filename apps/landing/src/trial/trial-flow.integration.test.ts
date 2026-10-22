// 체험판 흐름 통합 — 실제 TrialPage 마크업 + initTrial(실제 리듀서 · 파생 · DOM 반영) + 가짜 접점.
// 버튼을 실제로 눌러(click) 화면 · 소리 · 말하기 · 이벤트가 함께 맞는지 봅니다. 움직임은 줄인 상태(기본).

import { afterEach, describe, expect, it, vi } from "vitest";

import { textOf } from "../components/trial/trial-ui.support";
import { trialKo } from "../i18n/trial-ko";
import { formatCopy } from "./trial-copy-format";
import {
  type Harness,
  failed,
  finishEpilogue,
  flush,
  heard,
  liveText,
  mountTrial,
  noneShown,
  playToRoleplay,
  toClear,
  progressOf,
  settle,
  sfxOf,
  shown,
  speakTurn,
  stepOf,
  tap,
  tileTurn,
  unmount,
  visibleSteps,
  voicesOf,
} from "./trial-flow.test-support";
import { TRIAL_CLEAR_HOLD_MS } from "./trial-machine.contract";
import { SPEECH_CORRECT, TILES_CORRECT, u00AudioUrl } from "./trial.test-support";

let h: Harness | undefined;
afterEach(() => {
  unmount(h);
  h = undefined;
});

/** 보이는 section이 하나이고 루트 data-step · 진행 값이 그 단계와 맞는다. */
function expectStep(harness: Harness, step: string, progress: string): void {
  expect(visibleSteps(harness), `보이는 단계(${step})`).toEqual([`trial-step-${step}`]);
  expect(stepOf(harness)).toBe(step);
  expect(progressOf(harness)).toBe(progress);
}

const cutIndexOf = (harness: Harness) => shown(harness, "trial-cut").getAttribute("data-cut-index");
const turnIndexOf = (harness: Harness) =>
  shown(harness, "trial-turn").getAttribute("data-turn-index");

/** TI1 말하기 경로 전체를 누르며 단계 차례를 기록합니다. */
async function speechPath(harness: Harness): Promise<string[]> {
  const steps: string[] = [];
  const mark = () => steps.push(`${stepOf(harness)}:${progressOf(harness)}`);
  await settle();
  mark();
  for (let cut = 0; cut < 6; cut += 1) await tap(harness, "trial-cuts-next");
  mark();
  await tap(harness, "trial-vocab-next");
  mark();
  await tap(harness, "trial-option", 0);
  await tap(harness, "trial-choice-next");
  mark();
  await tap(harness, "trial-option", 2);
  await tap(harness, "trial-choice-next");
  mark();
  await tap(harness, "trial-culture-flip");
  await tap(harness, "trial-culture-next");
  mark();
  for (const index of [0, 1, 2]) {
    await speakTurn(harness, heard(SPEECH_CORRECT[index] ?? ""));
    await tap(harness, "trial-turn-next");
  }
  mark();
  await toClear(harness);
  mark();
  await settle();
  mark();
  return steps;
}

const SPEECH_PATH_STEPS = [
  "prologue:1",
  "vocab:2",
  "image-match:3",
  "reply-select:4",
  "culture:5",
  "roleplay:6",
  "epilogue:7",
  "clear:7",
  "complete:7",
];

describe("TI1 말하기 경로 — 처음부터 완료까지", () => {
  it("단계마다 보이는 section 하나 · data-step · 진행 aria 값", async () => {
    h = await mountTrial();
    // 표지 없이 열자마자 컷 1(TI-B1).
    expectStep(h, "prologue", "1");
    expect(cutIndexOf(h)).toBe("1");
    for (const expected of ["2", "3", "4", "5", "6"]) {
      await tap(h, "trial-cuts-next");
      expect(cutIndexOf(h)).toBe(expected);
    }
    await tap(h, "trial-cuts-next");
    expectStep(h, "vocab", "2");
    await tap(h, "trial-vocab-next");
    expectStep(h, "image-match", "3");
    noneShown(h, "trial-choice-next");
    await tap(h, "trial-option", 0);
    const picked = shown(h, "trial-step-image-match").querySelector('[data-option-index="0"]');
    expect(picked?.getAttribute("aria-pressed")).toBe("true");
    expect(picked?.getAttribute("data-result")).toBe("correct");
    shown(h, "trial-choice-verdict");
    await tap(h, "trial-choice-next");
    expectStep(h, "reply-select", "4");
    await tap(h, "trial-option", 2);
    await tap(h, "trial-choice-next");
    expectStep(h, "culture", "5");
    await tap(h, "trial-culture-flip");
    expect(shown(h, "trial-culture-card").getAttribute("data-face")).toBe("back");
    expect(shown(h, "trial-culture-flip").hasAttribute("aria-pressed")).toBe(false);
    expect(shown(h, "trial-culture-flip").getAttribute("aria-label")).toBe(
      h.data.copy.cultureFlipToFront,
    );
    await tap(h, "trial-culture-next");
    expectStep(h, "roleplay", "6");
    for (const index of [0, 1, 2]) {
      expect(turnIndexOf(h)).toBe(String(index));
      const turn = shown(h, "trial-turn");
      expect(turn.getAttribute("data-mode")).toBe("speech");
      expect(turn.getAttribute("data-phase")).toBe("ready");
      await speakTurn(h, heard(SPEECH_CORRECT[index] ?? ""));
      expect(turn.getAttribute("data-phase")).toBe("judged");
      expect(shown(h, "trial-turn-reply").getAttribute("data-verdict")).toBe("correct");
      await tap(h, "trial-turn-next");
    }
    expectStep(h, "epilogue", "7");
    expect(cutIndexOf(h)).toBe("1");
    for (const expected of ["2", "3", "4"]) {
      await tap(h, "trial-cuts-next");
      expect(cutIndexOf(h)).toBe(expected);
    }
    shown(h, "trial-cuts-next").click();
    await flush();
    expectStep(h, "clear", "7");
    await tap(h, "trial-clear-banner");
    expectStep(h, "complete", "7");
    expect(shown(h, "trial-step-complete").getAttribute("data-result")).toBe("passed");
    expect(h.errors).toEqual([]);
  });
});

describe("TI2 소리 — 음성 단서 · 잠금 해제 · 효과음 차례", () => {
  it("playVoice 차례 = 컷 5 · 6 · 단어 · 그림 · 대답 · 턴마다 상대 → 내 줄 · 엔딩 둘", async () => {
    h = await mountTrial();
    await speechPath(h);
    expect(voicesOf(h.audio)).toEqual(
      [
        "pre-5-dream",
        "d-01",
        "s1-01-word",
        "s1-01-word",
        "d-03",
        "d-01",
        "d-02",
        "d-03",
        "d-04",
        "d-05",
        "d-06",
        "post-1",
        "post-2",
      ].map((id) => u00AudioUrl(id)),
    );
  });

  it("TI-B1 unlock은 첫 탭 안에서 한 번 — 소리 호출 중 첫째(컷 1에서)", async () => {
    h = await mountTrial();
    await settle();
    expect(h.audio.calls).toEqual([]);
    await speechPath(h);
    const unlocks = h.audio.calls.filter((call) => call.kind === "unlock");
    expect(unlocks).toEqual([{ kind: "unlock", step: "prologue" }]);
    expect(h.audio.calls[0]).toEqual({ kind: "unlock", step: "prologue" });
  });

  it("playSfx 차례 = 효과음 파생 규칙(첫 탭 무음 · 통과 → pass_lesson, Episode clear → lesson_complete)", async () => {
    h = await mountTrial();
    await speechPath(h);
    expect(sfxOf(h.audio)).toEqual([
      "button",
      "correct_answer",
      "correct_answer",
      "button",
      "correct_answer",
      "correct_answer",
      "correct_answer",
      "pass_lesson",
      "lesson_complete",
    ]);
  });
});

describe("TI3 전송 — 말하기 경로의 GA 이벤트 차례", () => {
  it("trial_start · trial_step ×9 · trial_roleplay_result · trial_complete{verdict}", async () => {
    h = await mountTrial();
    const steps = await speechPath(h);
    expect(steps).toEqual(SPEECH_PATH_STEPS);
    const step = (name: string, ordinal: string) => ({
      name: "trial_step",
      params: { step: name, ordinal },
    });
    expect(h.sent).toEqual([
      { name: "trial_start", params: { speech: "supported" } },
      step("prologue", "1"),
      step("vocab", "2"),
      step("image-match", "3"),
      step("reply-select", "4"),
      step("culture", "5"),
      step("roleplay", "6"),
      ...(["1", "2", "3"] as const).map((turn) => ({
        name: "trial_speech_attempt",
        params: { turn, outcome: "strict", latency_bucket: "0-2s" },
      })),
      {
        name: "trial_roleplay_result",
        params: {
          verdict: "passed",
          correct: "3",
          by_speech: "3",
          by_tiles: "0",
          speech: "supported",
        },
      },
      step("epilogue", "7"),
      step("clear", "8"),
      step("complete", "9"),
      { name: "trial_complete", params: { verdict: "passed" } },
    ]);
  });
});

describe("TI4 타일 경로(말하기 미지원)", () => {
  it("notice · 타일 토글 · 놓인 글 · Check 해제 · 1턴 오답 공개 · 2/3 통과 · by_tiles 3", async () => {
    h = await mountTrial({ speech: "unsupported" });
    await playToRoleplay(h);
    const turn = shown(h, "trial-turn");
    expect(turn.getAttribute("data-mode")).toBe("tiles");
    const notice = shown(h, "trial-turn-notice");
    expect(notice.getAttribute("data-notice")).toBe("unsupported");
    expect(textOf(notice)).toBe(h.data.copy.noticeUnsupported);
    const tiles = h.data.model.roleplay.turns[0].tiles;
    await tap(h, "trial-tile", 2);
    const tile = turn.querySelector('[data-tile-index="2"]');
    expect(tile?.getAttribute("aria-pressed")).toBe("true");
    expect(textOf(shown(h, "trial-turn-composed"))).toBe(tiles[2]?.ko);
    await tap(h, "trial-tile", 2);
    expect(tile?.getAttribute("aria-pressed")).toBe("false");
    expect(textOf(shown(h, "trial-turn-composed"))).toBe("");
    const check = shown(h, "trial-turn-check");
    await tap(h, "trial-tile", 0);
    await tap(h, "trial-tile", 1);
    expect(check.getAttribute("aria-disabled")).toBe("true");
    await tap(h, "trial-tile", 2);
    expect(check.getAttribute("aria-disabled")).toBe("false");
    expect(textOf(shown(h, "trial-turn-composed"))).toBe(tiles.map((t) => t.ko).join(" "));
    await tap(h, "trial-turn-check");
    expect(shown(h, "trial-turn-reply").getAttribute("data-verdict")).toBe("incorrect");
    const answer = formatCopy(h.data.copy.correctAnswer, {
      answer: h.data.model.roleplay.turns[0].accepted[0],
    });
    expect(textOf(shown(h, "trial-turn-answer"))).toBe(answer);
    expect(liveText(h)).toContain(h.data.copy.notQuite);
    await tap(h, "trial-turn-next");
    await tileTurn(h, TILES_CORRECT[1] ?? []);
    await tap(h, "trial-turn-next");
    await tileTurn(h, TILES_CORRECT[2] ?? []);
    await tap(h, "trial-turn-next");
    expect(stepOf(h)).toBe("epilogue");
    expect(h.sent).toContainEqual({
      name: "trial_roleplay_result",
      params: {
        verdict: "passed",
        correct: "2",
        by_speech: "0",
        by_tiles: "3",
        speech: "unsupported",
      },
    });
    expect(h.sent[0]).toEqual({ name: "trial_start", params: { speech: "unsupported" } });
  });
});

describe("TI5 실패해도 끝까지(엔딩 → 완료 failed)", () => {
  it("1/3 → 엔딩 컷 → complete[data-result=failed] · 맞힌 수 문구 · trial_complete failed", async () => {
    h = await mountTrial({ speech: "unsupported" });
    await playToRoleplay(h);
    await tileTurn(h, [0, 1, 2]);
    await tap(h, "trial-turn-next");
    await tileTurn(h, [0, 1]);
    await tap(h, "trial-turn-next");
    await tileTurn(h, TILES_CORRECT[2] ?? []);
    await tap(h, "trial-turn-next");
    expectStep(h, "epilogue", "7");
    expect(cutIndexOf(h)).toBe("1");
    await finishEpilogue(h);
    expectStep(h, "complete", "7");
    const complete = shown(h, "trial-step-complete");
    expect(complete.getAttribute("data-result")).toBe("failed");
    const missed = complete.querySelector("[data-complete-missed]");
    expect(textOf(missed)).toBe(
      formatCopy(h.data.copy.completeBodyMissed, { correct: "1", total: "3" }),
    );
    expect(h.sent.at(-1)).toEqual({ name: "trial_complete", params: { verdict: "failed" } });
    expect(h.sent).toContainEqual({
      name: "trial_roleplay_result",
      params: {
        verdict: "failed",
        correct: "1",
        by_speech: "0",
        by_tiles: "3",
        speech: "unsupported",
      },
    });
    expect(sfxOf(h.audio)).not.toContain("pass_lesson");
    expect(sfxOf(h.audio).at(-1)).toBe("lesson_complete");
  });
});

describe("TI6 마이크 거부", () => {
  it("턴 1 Speak → denied → 같은 턴 타일 · 안내 낭독 · 이후 턴도 타일 · speech denied", async () => {
    h = await mountTrial();
    await playToRoleplay(h);
    await speakTurn(h, failed("denied"));
    expect(turnIndexOf(h)).toBe("0");
    expect(shown(h, "trial-turn").getAttribute("data-mode")).toBe("tiles");
    expect(shown(h, "trial-turn-notice").getAttribute("data-notice")).toBe("denied");
    expect(liveText(h)).toContain(h.data.copy.noticeDenied);
    for (const index of [0, 1, 2]) {
      expect(turnIndexOf(h)).toBe(String(index));
      expect(shown(h, "trial-turn").getAttribute("data-mode")).toBe("tiles");
      expect(shown(h, "trial-turn-notice").getAttribute("data-notice")).toBe("denied");
      await tileTurn(h, TILES_CORRECT[index] ?? []);
      await tap(h, "trial-turn-next");
    }
    expect(h.speech.listens).toBe(1);
    expect(h.sent).toContainEqual({
      name: "trial_roleplay_result",
      params: { verdict: "passed", correct: "3", by_speech: "0", by_tiles: "3", speech: "denied" },
    });
  });
});

describe("TI7 말하기 오답 · 다시 · 못 말함", () => {
  it("Not quite · You said · Next 없음 → Try again → ready · 상대 줄 다시 → Can't speak now → 타일", async () => {
    h = await mountTrial();
    await playToRoleplay(h);
    const turn = shown(h, "trial-turn");
    const lineUrl = u00AudioUrl("d-01");
    // d-01은 프롤로그 마지막 컷에서도 한 번 난다 — 턴에 들어선 재생부터 센다.
    const linePlays = () => voicesOf(h?.audio as Harness["audio"]).filter((url) => url === lineUrl);
    expect(voicesOf(h.audio).at(-1)).toBe(lineUrl);
    const entered = linePlays().length;
    await speakTurn(h, heard("감사합니다"));
    expect(turn.getAttribute("data-phase")).toBe("judged");
    expect(shown(h, "trial-turn-reply").getAttribute("data-verdict")).toBe("incorrect");
    expect(textOf(shown(h, "trial-turn-heard"))).toContain("감사합니다");
    expect(`${textOf(turn)} ${liveText(h)}`).toContain(
      formatCopy(h.data.copy.youSaid, { heard: "감사합니다" }),
    );
    expect(liveText(h)).toContain(h.data.copy.notQuite);
    noneShown(h, "trial-turn-next");
    await tap(h, "trial-turn-retry");
    expect(turn.getAttribute("data-phase")).toBe("ready");
    noneShown(h, "trial-turn-reply");
    expect(linePlays()).toHaveLength(entered + 1);
    await tap(h, "trial-turn-cant-speak");
    expect(turn.getAttribute("data-mode")).toBe("tiles");
    noneShown(h, "trial-turn-notice");
  });

  it("아무것도 못 들음(no-speech) → 오답 판정 · heardNothing 문구", async () => {
    h = await mountTrial();
    await playToRoleplay(h);
    await speakTurn(h, failed("no-speech"));
    expect(shown(h, "trial-turn-reply").getAttribute("data-verdict")).toBe("incorrect");
    expect(`${textOf(shown(h, "trial-turn"))} ${liveText(h)}`).toContain(h.data.copy.heardNothing);
    expect(sfxOf(h.audio).at(-1)).toBe("wrong_answer");
  });
});

describe("TI8 소리 실패", () => {
  it("playVoice가 늘 failed여도 TI1과 같은 화면 차례로 끝까지 · 예외 0", async () => {
    h = await mountTrial({ voice: "failed" });
    expect(await speechPath(h)).toEqual(SPEECH_PATH_STEPS);
    expect(h.errors).toEqual([]);
  });
});

describe("TI9 접근성 결선", () => {
  it("단계 전환마다 초점 = 그 단계 h2 · 컷 전환은 Next에 초점 · 컷 낭독", async () => {
    h = await mountTrial();
    const focusedHeading = () => h?.doc.activeElement?.closest("[data-step-heading]") ?? null;
    // 열 때는 초점을 옮기지 않는다(첫 렌더).
    expect(h.doc.activeElement).toBe(h.doc.body);
    const next = shown(h, "trial-cuts-next");
    next.focus();
    await tap(h, "trial-cuts-next");
    expect(h.doc.activeElement).toBe(next);
    const cut = h.data.model.prologue[1];
    expect(liveText(h)).toContain(cut.text.ko);
    expect(liveText(h)).toContain(cut.text.en ?? "");
    for (let rest = 0; rest < 5; rest += 1) await tap(h, "trial-cuts-next");
    expect(focusedHeading()).toBe(
      shown(h, "trial-step-vocab").querySelector("[data-step-heading]"),
    );
    await tap(h, "trial-vocab-next");
    expect(focusedHeading()).toBe(
      shown(h, "trial-step-image-match").querySelector("[data-step-heading]"),
    );
    await tap(h, "trial-option", 1);
    expect(liveText(h)).toContain(h.data.copy.choiceWrong);
    const option = shown(h, "trial-step-image-match").querySelector('[data-option-index="1"]');
    expect(option?.getAttribute("aria-disabled")).toBe("true");
  });

  it("듣는 중 · 안내가 trial-live에", async () => {
    h = await mountTrial();
    await playToRoleplay(h);
    expect(h.doc.activeElement).toBe(
      shown(h, "trial-step-roleplay").querySelector("[data-step-heading]"),
    );
    await tap(h, "trial-turn-speak");
    expect(shown(h, "trial-turn").getAttribute("data-phase")).toBe("listening");
    expect(shown(h, "trial-turn-speak").hasAttribute("aria-pressed")).toBe(false);
    expect(shown(h, "trial-turn-speak").getAttribute("aria-label")).toBe(h.data.copy.stop);
    expect(liveText(h)).toContain(h.data.copy.listening);
    h.speech.resolvePending(failed("unavailable"));
    await settle();
    expect(shown(h, "trial-turn").getAttribute("data-mode")).toBe("tiles");
    expect(liveText(h)).toContain(h.data.copy.noticeUnavailable);
  });
});

describe("TI10 ko 페이지", () => {
  it("판정 · 안내 · 진행 글이 한국어(formatCopy 결과)", async () => {
    h = await mountTrial({ language: "ko", speech: "unsupported" });
    await playToRoleplay(h);
    expect(textOf(shown(h, "trial-turn-notice"))).toBe(trialKo.noticeUnsupported);
    expect(textOf(shown(h, "trial-turn-progress"))).toBe(
      formatCopy(trialKo.lineProgress, { ordinal: "1", total: "3" }),
    );
    await tileTurn(h, TILES_CORRECT[0] ?? []);
    expect(liveText(h)).toContain(trialKo.great);
    await tap(h, "trial-turn-next");
    expect(textOf(shown(h, "trial-turn-progress"))).toBe(
      formatCopy(trialKo.lineProgress, { ordinal: "2", total: "3" }),
    );
    await tileTurn(h, [0, 1]);
    expect(liveText(h)).toContain(trialKo.notQuite);
  });
});

describe("TI12 연타 · 늦은 결과", () => {
  it("TI-B1 첫 탭 연타 → trial_start 하나 · unlock 하나 · 전체화면 요청 하나", async () => {
    h = await mountTrial();
    const next = shown(h, "trial-cuts-next");
    next.click();
    next.click();
    await tap(h, "trial-cuts-next");
    expect(h.sent.filter((event) => event.name === "trial_start")).toHaveLength(1);
    expect(h.audio.calls.filter((call) => call.kind === "unlock")).toHaveLength(1);
    expect(h.fullscreen.calls.filter((call) => call === "request")).toHaveLength(1);
  });

  it("듣는 중 Stop → speech.stop · 다시 listen 없음", async () => {
    h = await mountTrial();
    await playToRoleplay(h);
    await tap(h, "trial-turn-speak");
    await tap(h, "trial-turn-speak");
    expect(h.speech.listens).toBe(1);
    expect(h.speech.stops).toBe(1);
  });

  it("듣는 중 Can't speak now → speech.abort · 타일, 늦게 온 결과는 무시", async () => {
    h = await mountTrial();
    await playToRoleplay(h);
    await tap(h, "trial-turn-speak");
    await tap(h, "trial-turn-cant-speak");
    expect(h.speech.aborts).toBeGreaterThanOrEqual(1);
    const turn = shown(h, "trial-turn");
    expect(turn.getAttribute("data-mode")).toBe("tiles");
    const sfxBefore = sfxOf(h.audio).length;
    h.speech.resolvePending(heard(SPEECH_CORRECT[0] ?? ""));
    await tap(h, "trial-tile", 0);
    expect(turn.getAttribute("data-mode")).toBe("tiles");
    expect(turn.getAttribute("data-phase")).toBe("ready");
    noneShown(h, "trial-turn-reply");
    expect(sfxOf(h.audio).slice(sfxBefore)).not.toContain("correct_answer");
  });
});

describe("TI-B1 첫 탭 — 열 때 소리 · 이벤트 · 전체화면 0, 첫 탭에 잠금 해제 → 시작 이벤트 → 받아 두기", () => {
  it("열고 기다려도 호출 0, 첫 Next에 unlock · request · trial_start · trial_step(prologue) · prologue 음성 받기", async () => {
    h = await mountTrial();
    await settle();
    expect(h.audio.calls).toEqual([]);
    expect(h.sent).toEqual([]);
    expect(h.fullscreen.calls).toEqual([]);
    await tap(h, "trial-cuts-next");
    expect(h.audio.calls[0]).toEqual({ kind: "unlock", step: "prologue" });
    const prefetch = h.audio.calls.find((call) => call.kind === "prefetch");
    expect(prefetch?.kind === "prefetch" ? prefetch.urls : []).toEqual(
      expect.arrayContaining([u00AudioUrl("pre-5-dream"), u00AudioUrl("d-01")]),
    );
    expect(h.fullscreen.calls).toEqual(["request"]);
    expect(h.sent).toEqual([
      { name: "trial_start", params: { speech: "supported" } },
      { name: "trial_step", params: { step: "prologue", ordinal: "1" } },
    ]);
    // 첫 탭도 Next — 컷 2로 넘어갔다(움직임 줄이기라 타자 효과가 없다).
    expect(cutIndexOf(h)).toBe("2");
    await tap(h, "trial-cuts-next");
    expect(h.audio.calls.filter((call) => call.kind === "unlock")).toHaveLength(1);
    expect(h.fullscreen.calls).toEqual(["request"]);
  });

  it("말하기 미지원 판정도 첫 탭에서 — trial_start{unsupported}", async () => {
    h = await mountTrial({ speech: "unsupported" });
    await tap(h, "trial-cuts-next");
    expect(h.sent[0]).toEqual({ name: "trial_start", params: { speech: "unsupported" } });
  });

  it("나가기 링크를 누르면 전체화면을 푼다(이동은 막지 않음)", async () => {
    h = await mountTrial();
    await tap(h, "trial-cuts-next");
    const exit = h.root.querySelector('[data-testid="trial-exit"]') as HTMLElement;
    let prevented = false;
    exit.addEventListener("click", (event) => {
      prevented = event.defaultPrevented;
      event.preventDefault();
    });
    exit.click();
    expect(h.fullscreen.calls).toEqual(["request", "exit"]);
    expect(prevented).toBe(false);
  });
});

describe("TI-C1 엔딩 4컷 → Episode clear(배너 → 예고) → 완료", () => {
  /** 롤플레이를 지정한 결과로 마치고 엔딩 마지막 컷에 선다. */
  async function toLastEpilogueCut(harness: Harness, pass: boolean): Promise<void> {
    await playToRoleplay(harness);
    for (const index of [0, 1, 2]) {
      if (pass) await speakTurn(harness, heard(SPEECH_CORRECT[index] ?? ""));
      else {
        await tap(harness, "trial-turn-cant-speak");
        await tileTurn(harness, index === 2 ? [0] : index === 1 ? [0, 1] : [0, 1, 2]);
      }
      await tap(harness, "trial-turn-next");
    }
    for (let cut = 0; cut < 3; cut += 1) await tap(harness, "trial-cuts-next");
    expect(cutIndexOf(harness)).toBe("4");
  }

  it.each([true, false])(
    "엔딩 마지막 Next → 배너 「What happens next?」(lesson_complete · 초점 제목) → 1600ms 뒤 곧바로 완료(초점 완료 제목) (통과 %s)",
    async (pass) => {
      h = await mountTrial();
      await toLastEpilogueCut(h, pass);
      shown(h, "trial-cuts-next").click();
      await flush();
      expectStep(h, "clear", "7");
      shown(h, "trial-clear-banner");
      expect(sfxOf(h.audio).at(-1)).toBe("lesson_complete");
      expect(h.doc.activeElement).toBe(shown(h, "trial-clear-title"));
      expect(textOf(shown(h, "trial-clear-title"))).toBe("What happens next?");
      expect(h.root.querySelectorAll('[data-testid="trial-clear-teaser"]')).toHaveLength(0);
      await vi.advanceTimersByTimeAsync(TRIAL_CLEAR_HOLD_MS - 1);
      expect(stepOf(h)).toBe("clear");
      expect(h.fullscreen.calls).toEqual(["request"]);
      await vi.advanceTimersByTimeAsync(1);
      expectStep(h, "complete", "7");
      // 이메일 칸이 아니라 완료 제목 — 모바일 자판이 저절로 올라오지 않게(spec-r3 §10).
      const heading = shown(h, "trial-step-complete").querySelector("[data-step-heading]");
      expect(h.doc.activeElement).toBe(heading);
      expect(h.doc.activeElement).not.toBe(shown(h, "trial-prereg-email"));
      expect(shown(h, "trial-step-complete").getAttribute("data-result")).toBe(
        pass ? "passed" : "failed",
      );
      expect(h.fullscreen.calls).toEqual(["request", "exit"]);
      expect(h.sent.at(-1)).toEqual({
        name: "trial_complete",
        params: { verdict: pass ? "passed" : "failed" },
      });
      expect(sfxOf(h.audio).at(-1)).toBe("lesson_complete");
      expect(h.errors).toEqual([]);
    },
  );

  it("배너를 누르면 바로 완료 — 남은 유지 시간은 지워지고 이벤트 · 완료는 한 번", async () => {
    h = await mountTrial();
    await toLastEpilogueCut(h, true);
    shown(h, "trial-cuts-next").click();
    await flush();
    await vi.advanceTimersByTimeAsync(500);
    shown(h, "trial-clear-banner").click();
    await flush();
    expect(stepOf(h)).toBe("complete");
    await vi.advanceTimersByTimeAsync(TRIAL_CLEAR_HOLD_MS * 2);
    expect(stepOf(h)).toBe("complete");
    expect(h.sent.filter((event) => event.name === "trial_complete")).toHaveLength(1);
  });

  it("엔딩 4컷 글이 차례로 — 3 · 4는 「누구였을까?」 · 「여행은 이제 시작이다」 독백(음성 없음)", async () => {
    h = await mountTrial();
    await playToRoleplay(h);
    for (const index of [0, 1, 2]) {
      await speakTurn(h, heard(SPEECH_CORRECT[index] ?? ""));
      await tap(h, "trial-turn-next");
    }
    const voices = voicesOf(h.audio).length;
    await tap(h, "trial-cuts-next");
    await tap(h, "trial-cuts-next");
    expect(textOf(shown(h, "trial-cut-line"))).toContain("누구였을까?");
    await tap(h, "trial-cuts-next");
    expect(textOf(shown(h, "trial-cut-line"))).toContain("여행은 이제 시작이다");
    expect(voicesOf(h.audio).slice(voices)).toEqual([u00AudioUrl("post-2")]);
  });
});
