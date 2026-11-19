import { describe, expect, test } from "vitest";

import { holdsAudio, startedPlayback, voiceSampleStep } from "./voice-sample";
import type { VoiceSampleEvent, VoiceSampleState } from "./voice-sample";

// `unit` 계층(VS-U1 ~ U6): 목소리 견본 단추의 상태 기계(ADR-0162 2026-11-19 추가). 누를 때만 틀고, 닫히면 멈추고, 다른 소리가 대신하면
// idle로 돌아가며, 못 읽으면 조용한 error.

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

  test("VS-U2 못 읽음 → error, 다시 누르면 한 번 더 시도", () => {
    expect(walk(["tap", "unavailable"]).state).toBe("error");
    expect(voiceSampleStep("error", "tap")).toEqual({ state: "loading", effect: "play" });
  });

  test("VS-U3 끝난 뒤 다시 누르면 처음부터(play)", () => {
    expect(voiceSampleStep("ended", "tap")).toEqual({ state: "loading", effect: "play" });
  });

  test("VS-U4 시트가 닫히면 어디서든 idle — 소리가 있던 상태만 stop", () => {
    const all: VoiceSampleState[] = ["idle", "loading", "playing", "paused", "ended", "error"];
    for (const state of all) {
      expect(voiceSampleStep(state, "close"), state).toEqual({
        state: "idle",
        effect: holdsAudio(state) ? "stop" : null,
      });
    }
    expect(all.filter(holdsAudio)).toEqual(["loading", "playing", "paused"]);
  });

  test("VS-U5 다른 소리가 대신하면 idle — 그 소리를 멈추지 않는다(하나만 재생)", () => {
    expect(voiceSampleStep("playing", "interrupted")).toEqual({ state: "idle", effect: null });
    expect(voiceSampleStep("paused", "interrupted")).toEqual({ state: "idle", effect: null });
    expect(voiceSampleStep("ended", "interrupted")).toEqual({ state: "ended", effect: null });
  });

  test("VS-U6 늦게 온 신호는 무시 — loading 중 탭 · idle에서 finished · started", () => {
    expect(voiceSampleStep("loading", "tap")).toEqual({ state: "loading", effect: null });
    expect(voiceSampleStep("idle", "finished")).toEqual({ state: "idle", effect: null });
    expect(voiceSampleStep("idle", "started")).toEqual({ state: "idle", effect: null });
    expect(voiceSampleStep("paused", "unavailable")).toEqual({ state: "paused", effect: null });
  });

  test("VS-U7 새 재생의 시작은 loading → playing 하나뿐(이어 듣기는 세지 않음)", () => {
    expect(startedPlayback("loading", "playing")).toBe(true);
    expect(startedPlayback("paused", "playing")).toBe(false);
    expect(startedPlayback("loading", "error")).toBe(false);
  });
});
