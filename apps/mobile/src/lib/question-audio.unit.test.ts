import { describe, expect, it } from "vitest";

import {
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
    expect(answerEchoCueOf("3", echo, true, "on")).toEqual({ key: "3:echo", source: echo.source });
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
