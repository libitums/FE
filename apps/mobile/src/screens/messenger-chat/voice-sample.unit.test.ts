import { describe, expect, test } from "vitest";

import {
  finishEventOf,
  holdsAudio,
  QUICK_FINISH_MS,
  startedPlayback,
  voiceButtonKind,
  voiceSampleStep,
} from "./voice-sample";
import type { VoiceSampleEvent, VoiceSampleState } from "./voice-sample";

// `unit` 계층(VS-U1 ~ U8): 목소리 견본 단추의 상태 기계(ADR-0164 앱 추가 2026-11-20). 누를 때만 틀고, 닫히면 멈추고, 다른 소리가
// 대신하면 idle로 돌아가며(하나만 재생), 못 읽으면 조용한 error.

const ALL: readonly VoiceSampleState[] = ["idle", "loading", "playing", "paused", "ended", "error"];

const walk = (events: readonly VoiceSampleEvent[], from: VoiceSampleState = "idle") =>
  events.reduce<{ state: VoiceSampleState; effects: (string | null)[] }>(
    (acc, event) => {
      const step = voiceSampleStep(acc.state, event);
      return { state: step.state, effects: [...acc.effects, step.effect] };
    },
    { state: from, effects: [] },
  );

describe("견본 상태 기계", () => {
  test("VS-U1 idle → loading(play) → playing → paused(pause) → playing(resume) → ended", () => {
    const run = walk(["tap", "started", "tap", "tap", "finished"]);
    expect(run.state).toBe("ended");
    expect(run.effects).toEqual(["play", null, "pause", "resume", null]);
  });

  test("VS-U2 재생 모듈 없음 · 주소 없음 → error, 다시 누르면 한 번 더 시도", () => {
    expect(walk(["tap", "unavailable"]).state).toBe("error");
    expect(voiceSampleStep("error", "tap")).toEqual({ state: "loading", effect: "play" });
  });

  test("VS-U3 너무 빨리 끝남 = 못 읽음 → error, 견본 길이만큼 가면 ended", () => {
    expect(finishEventOf(0)).toBe("failed");
    expect(finishEventOf(QUICK_FINISH_MS - 1)).toBe("failed");
    expect(finishEventOf(QUICK_FINISH_MS)).toBe("finished");
    expect(walk(["tap", "started", "failed"]).state).toBe("error");
    expect(voiceSampleStep("ended", "tap")).toEqual({ state: "loading", effect: "play" });
  });

  test("VS-U4 시트가 닫히면 어디서든 idle — 소리를 쥔 상태만 stop", () => {
    for (const state of ALL) {
      expect(voiceSampleStep(state, "close"), state).toEqual({
        state: "idle",
        effect: holdsAudio(state) ? "stop" : null,
      });
    }
    expect(ALL.filter(holdsAudio)).toEqual(["loading", "playing", "paused"]);
  });

  test("VS-U5 다른 소리가 대신하면 idle — 그 소리를 멈추지 않는다(하나만 재생)", () => {
    expect(voiceSampleStep("playing", "interrupted")).toEqual({ state: "idle", effect: null });
    expect(voiceSampleStep("paused", "interrupted")).toEqual({ state: "idle", effect: null });
    expect(voiceSampleStep("ended", "interrupted")).toEqual({ state: "ended", effect: null });
    expect(voiceSampleStep("error", "interrupted")).toEqual({ state: "error", effect: null });
  });

  test("VS-U6 늦게 온 신호는 무시 — loading 중 탭 · idle에서 finished · started · failed", () => {
    expect(voiceSampleStep("loading", "tap")).toEqual({ state: "loading", effect: null });
    expect(voiceSampleStep("idle", "finished")).toEqual({ state: "idle", effect: null });
    expect(voiceSampleStep("idle", "started")).toEqual({ state: "idle", effect: null });
    expect(voiceSampleStep("idle", "failed")).toEqual({ state: "idle", effect: null });
    expect(voiceSampleStep("paused", "unavailable")).toEqual({ state: "paused", effect: null });
  });

  test("VS-U7 새 재생의 시작은 loading → playing 하나뿐(이어 듣기 · 실패는 세지 않음)", () => {
    expect(startedPlayback("loading", "playing")).toBe(true);
    expect(startedPlayback("paused", "playing")).toBe(false);
    expect(startedPlayback("loading", "error")).toBe(false);
  });

  test("VS-U8 단추 글 — playing = pause, paused = resume, 그 밖 = hear(자동 재생 없음: 처음은 idle)", () => {
    expect(ALL.map(voiceButtonKind)).toEqual(["hear", "hear", "pause", "resume", "hear", "hear"]);
  });
});
