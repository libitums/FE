import { describe, expect, it } from "vitest";

import {
  ANSWER_ECHO_DELAY_MS,
  advanceAfterAnswerMs,
  answerEchoCueOf,
  autoPlayAudioOf,
  listenCueOf,
  standaloneLessonAudio,
} from "./question-audio";
import type { AnswerEchoAudio, ListenAudio } from "./question-audio";
import { initialSessionOptions } from "./session-options";

// `unit` 계층: 문항 음성 신호와 단독 레슨 소리 설정의 입출력만 봅니다.

const listen: ListenAudio = {
  kind: "listen",
  source: "https://cdn/audio/u01-water/a.m4a",
  ref: { itemId: "S2-01", itemType: "LISTEN_SELECT" },
};
const echo: AnswerEchoAudio = { kind: "answer-echo", source: "https://cdn/audio/u01-water/b.m4a" };

describe("listenCueOf", () => {
  it("QA1. 듣기 갈래면 { key, audio }를 낸다", () => {
    expect(listenCueOf("3", listen)).toEqual({ key: "3", audio: listen });
  });

  it.each([
    ["정답 뒤 재생 갈래", echo],
    ["null", null],
    ["undefined", undefined],
  ])("QA1. %s이면 null이다", (_name, audio) => {
    expect(listenCueOf("3", audio)).toBeNull();
  });
});

describe("answerEchoCueOf", () => {
  it("QA2. 정답 뒤 재생 갈래이고 판정이 났고 자동 재생이 켜지면 키에 :echo가 붙는다", () => {
    expect(answerEchoCueOf("3", echo, true, "on")).toEqual({
      key: "3:echo",
      source: echo.source,
      delayMs: ANSWER_ECHO_DELAY_MS,
    });
  });

  it("QD1. 정답 뒤 음성은 판정 효과음(0.74초)이 끝난 뒤에 시작한다", () => {
    expect(ANSWER_ECHO_DELAY_MS).toBeGreaterThanOrEqual(750);
    expect(ANSWER_ECHO_DELAY_MS).toBeLessThanOrEqual(1000);
    expect(answerEchoCueOf("3", echo, true, "on")?.delayMs).toBe(ANSWER_ECHO_DELAY_MS);
  });

  it("QD2. 정답 음성을 단 듣기 갈래(대답 고르기)는 판정 뒤 그 정답 음성 신호를 낸다", () => {
    const reply: ListenAudio = {
      ...listen,
      echo: { kind: "answer-echo", source: "https://cdn/audio/u01-water/reply.m4a" },
    };
    expect(answerEchoCueOf("3", reply, true, "on")).toEqual({
      key: "3:echo",
      source: "https://cdn/audio/u01-water/reply.m4a",
      delayMs: ANSWER_ECHO_DELAY_MS,
    });
    expect(answerEchoCueOf("3", reply, false, "on")).toBeNull();
    expect(answerEchoCueOf("3", reply, true, "off")).toBeNull();
  });

  it("QA3. 판정 전이면 null이다", () => {
    expect(answerEchoCueOf("3", echo, false, "on")).toBeNull();
  });

  it("QA3. 자동 재생이 꺼지면 null이다", () => {
    expect(answerEchoCueOf("3", echo, true, "off")).toBeNull();
  });

  it("QA3. 듣기 갈래 · null · undefined면 null이다", () => {
    expect(answerEchoCueOf("3", listen, true, "on")).toBeNull();
    expect(answerEchoCueOf("3", null, true, "on")).toBeNull();
    expect(answerEchoCueOf("3", undefined, true, "on")).toBeNull();
  });
});

describe("autoPlayAudioOf", () => {
  it("QA4. 처음 옵션은 on이고 자동 재생을 끄면 off다", () => {
    expect(autoPlayAudioOf(initialSessionOptions)).toBe("on");
    expect(autoPlayAudioOf({ ...initialSessionOptions, "auto-play-audio": false })).toBe("off");
  });

  it("QA4. 대본 옵션은 자동 재생에 영향을 주지 않는다", () => {
    expect(autoPlayAudioOf({ ...initialSessionOptions, "show-transcript": false })).toBe("on");
  });
});

describe("standaloneLessonAudio", () => {
  it("QA5. normal · unsupported · 옵션의 자동 재생이다", () => {
    const on = standaloneLessonAudio(initialSessionOptions);
    const off = standaloneLessonAudio({ ...initialSessionOptions, "auto-play-audio": false });

    expect(on.pace).toBe("normal");
    expect(on.slowPlayback).toBe("unsupported");
    expect(on.autoPlay).toBe("on");
    expect(off.autoPlay).toBe("off");
  });

  it("QA5. 두 콜백은 던지지 않는다", () => {
    const lesson = standaloneLessonAudio(initialSessionOptions);

    expect(() => lesson.onTogglePace()).not.toThrow();
    expect(() =>
      lesson.onListenItemAnswered({
        ref: listen.ref,
        result: "correct",
        pace: "normal",
        slowTurnedOn: false,
        replayCount: 0,
        slowReplayCount: 0,
      }),
    ).not.toThrow();
  });
});

describe("advanceAfterAnswerMs — 저절로 넘어가는 틈", () => {
  it("QD3. 정답 음성 길이를 알면 틈 + 길이 + 꼬리까지 기다린다(기본보다 짧아지지 않는다)", () => {
    const long: AnswerEchoAudio = { ...echo, speechMs: 3110 };
    expect(advanceAfterAnswerMs(2500, long, "on")).toBe(ANSWER_ECHO_DELAY_MS + 3110 + 400);
    expect(advanceAfterAnswerMs(2500, { ...echo, speechMs: 600 }, "on")).toBe(2500);
  });

  it("QD4. 대답 고르기의 정답 음성도 같은 규칙이다", () => {
    const reply: ListenAudio = { ...listen, echo: { ...echo, speechMs: 2000 } };
    expect(advanceAfterAnswerMs(2500, reply, "on")).toBe(ANSWER_ECHO_DELAY_MS + 2000 + 400);
  });

  it("QD5. 길이를 모르거나 · 정답 음성이 없거나 · 자동 재생이 꺼지면 기본값이다", () => {
    expect(advanceAfterAnswerMs(2500, echo, "on")).toBe(2500);
    expect(advanceAfterAnswerMs(2500, listen, "on")).toBe(2500);
    expect(advanceAfterAnswerMs(2500, null, "on")).toBe(2500);
    expect(advanceAfterAnswerMs(2500, { ...echo, speechMs: 3110 }, "off")).toBe(2500);
  });

  it("QD6. 아주 긴 녹음이어도 6초를 넘겨 기다리지 않는다", () => {
    expect(advanceAfterAnswerMs(2500, { ...echo, speechMs: 20000 }, "on")).toBe(6000);
  });
});
