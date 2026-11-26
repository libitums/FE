import { describe, expect, test } from "vitest";

import {
  initialMissionVoice,
  missionVoiceReducer,
  recordClock,
  transcriptDecision,
} from "./mission-voice";
import { fakeHeard } from "./mission-fake-rules";
import type { MissionVoiceAction, MissionVoiceState } from "./mission-voice.contract";

// `unit` 계층(MVO-U1 ~): 미션 음성의 순수 규칙 — 받아 적은 글을 바로 보낼지(서버 `autoSend`), 녹음 · 재생 상태, 시간 표시.

const run = (
  actions: readonly MissionVoiceAction[],
  from: MissionVoiceState = initialMissionVoice,
) => actions.reduce(missionVoiceReducer, from);

describe("받아 적은 글의 판단", () => {
  test("MVO-U1 서버가 ok면 바로 보내고, 확신도 낮음 · 짧음 · 확신도 없음은 입력 칸에서 확인", () => {
    expect(transcriptDecision(fakeHeard(" 카드로 할게요 ", true, "ok"))).toEqual({
      kind: "send",
      text: "카드로 할게요",
    });
    for (const reason of ["low_confidence", "too_short", "no_confidence"] as const)
      expect(transcriptDecision(fakeHeard("네", false, reason))).toEqual({
        kind: "confirm",
        text: "네",
        check: "heard",
      });
    expect(transcriptDecision(fakeHeard("네", true, "no_confidence"))).toEqual({
      kind: "send",
      text: "네",
    });
  });

  test("MVO-U2 한국어가 아니면 다른 안내, 빈 결과 · 실패는 안내만", () => {
    expect(transcriptDecision(fakeHeard("card", false, "not_korean"))).toEqual({
      kind: "confirm",
      text: "card",
      check: "notKorean",
    });
    expect(transcriptDecision(fakeHeard(" ", true, "ok"))).toEqual({
      kind: "notice",
      notice: "notHeard",
    });
    expect(transcriptDecision({ kind: "failed", error: "speech_busy" })).toEqual({
      kind: "notice",
      notice: "busy",
    });
    expect(transcriptDecision({ kind: "failed", error: "speech_unavailable" })).toEqual({
      kind: "notice",
      notice: "serverDown",
    });
    expect(transcriptDecision({ kind: "failed", error: "speech_empty" })).toEqual({
      kind: "notice",
      notice: "notHeard",
    });
  });
});

describe("녹음 · 재생 상태", () => {
  test("MVO-U3 녹음 → 눈금 → 받아 적기 → 확인, 30초 상한 안내는 받아 적은 뒤에도 남는다", () => {
    const recording = run([
      { type: "record-started" },
      { type: "record-tick", seconds: 3.4, level: 0.6 },
    ]);
    expect(recording).toMatchObject({ rec: "recording", seconds: 3.4, level: 0.6 });
    const limited = run([{ type: "record-stopped", limit: true }], recording);
    expect(limited).toMatchObject({ rec: "transcribing", notice: "maxLength" });
    expect(run([{ type: "transcribed", check: "heard" }], limited)).toMatchObject({
      rec: "idle",
      notice: "maxLength",
      check: "heard",
    });
    expect(run([{ type: "record-stopped", limit: false }], initialMissionVoice)).toBe(
      initialMissionVoice,
    );
  });

  test("MVO-U4 실패 · 취소 · 확인 지우기", () => {
    expect(run([{ type: "record-failed", notice: "micDenied" }])).toMatchObject({
      rec: "idle",
      notice: "micDenied",
    });
    expect(run([{ type: "record-started" }, { type: "record-cancelled" }]).rec).toBe("idle");
    expect(run([{ type: "record-cancelled" }])).toBe(initialMissionVoice);
    const checking = run([{ type: "transcribed", check: "notKorean" }]);
    expect(run([{ type: "check-cleared" }], checking)).toMatchObject({ check: null, notice: null });
  });

  test("MVO-U5 재생 — 합성 중 → 재생 → 끝, 다른 자리의 늦은 신호는 버린다", () => {
    const playing = run([
      { type: "play-loading", key: "m1" },
      { type: "play-started", key: "m1" },
    ]);
    expect(playing.playback).toEqual({ key: "m1", status: "playing" });
    expect(run([{ type: "play-ended", key: "m0" }], playing)).toBe(playing);
    expect(run([{ type: "play-ended", key: "m1" }], playing).playback.status).toBe("idle");
    expect(run([{ type: "play-stopped" }], playing).playback).toEqual({
      key: null,
      status: "idle",
    });
  });

  test("MVO-U6 녹음 시간 표시", () => {
    expect(recordClock(0)).toBe("0:00");
    expect(recordClock(7.9)).toBe("0:07");
    expect(recordClock(30)).toBe("0:30");
    expect(recordClock(75)).toBe("1:15");
  });
});
