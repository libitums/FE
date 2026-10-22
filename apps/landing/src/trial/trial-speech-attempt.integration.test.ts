// `integration` 계층: 실제 TrialPage + 컨트롤러 + 가짜 접점. 발음 기준 판정이 화면에 Great로 서는지,
// 말하기 시도마다 trial_speech_attempt가 한 번만 나가는지, 판정 뒤 수집이 한 번 가는지(던져도 진행), 나가기 이벤트를 본다.

import { afterEach, describe, expect, it, vi } from "vitest";

import { textOf } from "../components/trial/trial-ui.support";
import type { AnalyticsEvent } from "../scripts/analytics.contract";
import {
  type Harness,
  failed,
  flush,
  heard,
  mountTrial,
  playToRoleplay,
  shown,
  speakTurn,
  tap,
  unmount,
} from "./trial-flow.test-support";
import { SPEECH_CORRECT } from "./trial.test-support";

let h: Harness | undefined;

afterEach(() => {
  unmount(h);
  h = undefined;
});

const attempts = (harness: Harness) =>
  harness.sent.filter((event) => event.name === "trial_speech_attempt");
const attempt = (turn: string, outcome: string, latency = "0-2s"): AnalyticsEvent =>
  ({
    name: "trial_speech_attempt",
    params: { turn, outcome, latency_bucket: latency },
  }) as AnalyticsEvent;

describe("TI-L1 발음 기준 판정 → Great", () => {
  it("앱 규칙으로는 틀린 띄어쓰기(「처음 이에요」)도 Great · 들은 말은 그 대안 · Continue", async () => {
    h = await mountTrial();
    await playToRoleplay(h);
    await speakTurn(h, heard("안녕 가세요", "안녕하세요 네 처음 이에요"));
    const turn = shown(h, "trial-turn");
    expect(turn.getAttribute("data-phase")).toBe("judged");
    expect(shown(h, "trial-turn-reply").getAttribute("data-verdict")).toBe("correct");
    expect(textOf(shown(h, "trial-turn-heard"))).toBe("안녕하세요 네 처음 이에요");
    shown(h, "trial-turn-next");
    await tap(h, "trial-turn-next");
    expect(shown(h, "trial-turn").getAttribute("data-turn-index")).toBe("1");
  });

  it("앱 규칙으로 맞는 답(strict)도 같은 Great", async () => {
    h = await mountTrial();
    await playToRoleplay(h);
    await speakTurn(h, heard(SPEECH_CORRECT[0] ?? ""));
    expect(shown(h, "trial-turn-reply").getAttribute("data-verdict")).toBe("correct");
  });
});

describe("TI-S1 trial_speech_attempt — 시도마다 한 번", () => {
  it("strict · lenient · incorrect → 다시 → no-speech → 다시 → denied(타일로) 차례대로 하나씩", async () => {
    h = await mountTrial();
    await playToRoleplay(h);
    await speakTurn(h, heard(SPEECH_CORRECT[0] ?? ""));
    await tap(h, "trial-turn-next");
    await speakTurn(h, heard("감사함니다 진짜요"));
    await tap(h, "trial-turn-next");
    await speakTurn(h, heard("언제부터요"));
    await tap(h, "trial-turn-retry");
    await speakTurn(h, failed("no-speech"));
    await tap(h, "trial-turn-retry");
    await speakTurn(h, failed("denied"));
    expect(attempts(h)).toEqual([
      attempt("1", "strict"),
      attempt("2", "lenient"),
      attempt("3", "incorrect"),
      attempt("3", "no-speech"),
      attempt("3", "denied"),
    ]);
  });

  it("unavailable · 언어 미지원(unavailable로) — 이번 턴만 타일", async () => {
    h = await mountTrial();
    await playToRoleplay(h);
    await speakTurn(h, failed("unsupported"));
    expect(attempts(h)).toEqual([attempt("1", "unavailable")]);
    expect(shown(h, "trial-turn").getAttribute("data-mode")).toBe("tiles");
  });

  it("듣는 중 Can't speak now → aborted 한 번, 늦게 온 결과는 이벤트 · 판정 0", async () => {
    h = await mountTrial();
    await playToRoleplay(h);
    shown(h, "trial-turn-speak").click();
    await flush();
    expect(h.speech.listens).toBe(1);
    await tap(h, "trial-turn-cant-speak");
    h.speech.resolvePending(heard(SPEECH_CORRECT[0] ?? ""));
    await flush();
    expect(attempts(h)).toEqual([attempt("1", "aborted")]);
    expect(shown(h, "trial-turn").getAttribute("data-mode")).toBe("tiles");
  });

  it("시간 구간 — Speak부터 결과까지(가짜 시계 5초 → 4-6s, 9초 → 8s+)", async () => {
    h = await mountTrial();
    await playToRoleplay(h);
    shown(h, "trial-turn-speak").click();
    await vi.advanceTimersByTimeAsync(5_000);
    h.speech.resolvePending(heard("언제부터요"));
    await flush();
    shown(h, "trial-turn-retry").click();
    await flush();
    shown(h, "trial-turn-speak").click();
    await vi.advanceTimersByTimeAsync(9_000);
    h.speech.resolvePending(failed("no-speech"));
    await flush();
    expect(attempts(h)).toEqual([
      attempt("1", "incorrect", "4-6s"),
      attempt("1", "no-speech", "8s+"),
    ]);
  });

  it("타일 턴(말하기 없음)은 시도 이벤트 0", async () => {
    h = await mountTrial({ speech: "unsupported" });
    await playToRoleplay(h);
    await tap(h, "trial-tile", 2);
    await tap(h, "trial-tile", 0);
    await tap(h, "trial-tile", 1);
    await tap(h, "trial-turn-check");
    expect(attempts(h)).toEqual([]);
  });
});

describe("TI-S2 trial_exit", () => {
  it("나가기를 누른 단계 하나(이동은 막지 않음), 완료 홈 링크는 0", async () => {
    h = await mountTrial();
    await playToRoleplay(h);
    const exit = h.root.querySelector('[data-testid="trial-exit"]') as HTMLElement;
    exit.addEventListener("click", (event) => event.preventDefault());
    exit.click();
    const harness = h;
    expect(harness.sent.filter((event) => event.name === "trial_exit")).toEqual([
      { name: "trial_exit", params: { step: "roleplay" } },
    ]);
    const home = h.root.querySelector('[data-testid="trial-complete-home"]') as HTMLElement;
    home.addEventListener("click", (event) => event.preventDefault());
    home.click();
    expect(harness.sent.filter((event) => event.name === "trial_exit")).toHaveLength(1);
  });

  it("처음 컷(첫 탭 전)에서 나가도 prologue로 하나", async () => {
    h = await mountTrial();
    const exit = h.root.querySelector('[data-testid="trial-exit"]') as HTMLElement;
    exit.addEventListener("click", (event) => event.preventDefault());
    exit.click();
    expect(h.sent).toEqual([{ name: "trial_exit", params: { step: "prologue" } }]);
  });
});

describe("TI-C1 수집 — 판정 뒤 한 번", () => {
  it("heard 판정마다 하나(턴 · 정답 · 대안 · 결과 · 일치도), 실패 · 타일은 0", async () => {
    h = await mountTrial();
    await playToRoleplay(h);
    await speakTurn(h, heard("안녕 가세요", "안녕하세요 네 처음 이에요"));
    await tap(h, "trial-turn-next");
    await speakTurn(h, heard("감사합니다"));
    await tap(h, "trial-turn-retry");
    await speakTurn(h, failed("no-speech"));
    await tap(h, "trial-turn-cant-speak");
    await tap(h, "trial-tile", 1);
    await tap(h, "trial-tile", 0);
    await tap(h, "trial-turn-check");
    expect(h.samples.sent).toEqual([
      {
        turnIndex: 0,
        expected: "안녕하세요! 네, 처음이에요!",
        alternatives: ["안녕 가세요", "안녕하세요 네 처음 이에요"],
        outcome: "lenient",
        similarity: 1,
      },
      {
        turnIndex: 1,
        expected: "진짜요? 감사합니다!",
        alternatives: ["감사합니다"],
        outcome: "incorrect",
        similarity: 0.778,
      },
    ]);
  });

  it("던지는 접점이어도 판정 · 진행 · 이벤트는 그대로, 오류 0", async () => {
    h = await mountTrial({ samples: "throwing" });
    await playToRoleplay(h);
    await speakTurn(h, heard(SPEECH_CORRECT[0] ?? ""));
    expect(h.samples.sent).toHaveLength(1);
    expect(shown(h, "trial-turn-reply").getAttribute("data-verdict")).toBe("correct");
    expect(attempts(h)).toEqual([attempt("1", "strict")]);
    await tap(h, "trial-turn-next");
    expect(shown(h, "trial-turn").getAttribute("data-turn-index")).toBe("1");
    expect(h.errors).toEqual([]);
  });

  it("접점이 없으면(null) 보내지 않고 판정은 그대로", async () => {
    h = await mountTrial({ samples: false });
    await playToRoleplay(h);
    await speakTurn(h, heard(SPEECH_CORRECT[0] ?? ""));
    expect(h.samples.sent).toEqual([]);
    expect(shown(h, "trial-turn-reply").getAttribute("data-verdict")).toBe("correct");
  });
});
