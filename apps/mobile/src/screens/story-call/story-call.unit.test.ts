import { expect, test } from "vitest";

import type { EpisodeCall } from "../../lib/episode-content.model";
import { formatCallClock, storyCallHoldMs, storyCallViewOf } from "./story-call";

// `unit` 계층: 전화 막간의 표시 모델 · 대사 시간 · 통화 시계.

const call: EpisodeCall = {
  counterpart: "사장님",
  counterpartImageUrl: "content/images/profiles/yoonkyung-casual.webp",
  backgroundUrl: "content/images/u09/pre-2.webp",
  lines: [
    {
      kind: "caller",
      label: "사장님",
      line: { ko: "{name} 씨, 어디예요?", en: "Where are you, {name}?" },
    },
    {
      kind: "caller",
      label: "사장님",
      line: { ko: "광장시장 가요?", en: "Going to Gwangjang?" },
      audioUrl: "u09-subway/int-02",
    },
    { kind: "self", label: "", line: { ko: "역이에요" } },
    {
      kind: "background",
      label: "안내 방송",
      line: { ko: "열차가 들어옵니다", en: "Train arriving" },
    },
  ],
  end: { ko: "뚝.", en: "Click." },
};
const port = {
  imageUrlOf: (path: string) => (/profiles|audio/.test(path) ? `res://${path}` : null),
  fill: (text: string) => text.replace("{name}", "Alex"),
  audioTimingOf: (id: string) =>
    id === "u09-subway/int-02" ? { durationMs: 2600, speechEndMs: 2300 } : null,
};

test("SC1. 그림을 해석하고 글을 채우며, 해석 못 한 그림 · 없는 번역은 null · 빈 문자열이다", () => {
  const view = storyCallViewOf(call, port);
  expect(view.counterpart).toBe("사장님");
  expect(view.counterpartAvatarUrl).toBe("res://content/images/profiles/yoonkyung-casual.webp");
  expect(view.backgroundUrl).toBeNull();
  expect(view.lines.map((l) => `${l.kind}:${l.label}:${l.text.ko}:${l.text.en}`)).toEqual([
    "caller:사장님:Alex 씨, 어디예요?:Where are you, Alex?",
    "caller:사장님:광장시장 가요?:Going to Gwangjang?",
    "self::역이에요:",
    "background:안내 방송:열차가 들어옵니다:Train arriving",
  ]);
  expect(view.end).toEqual({ ko: "뚝.", en: "Click." });
  expect(storyCallViewOf({ ...call, end: undefined }, port).end).toBeNull();
});

test("SC2. 대사 시간 — 소리 길이를 알면 말이 끝난 뒤 틈만큼, 모르면 한국어 · 영어 글로 넉넉히 잡는다", () => {
  // 소리: 말 끝(2300) + 틈(900). 짧은 소리라도 2.4초 아래로 내리지 않습니다.
  expect(storyCallHoldMs({ koChars: 8, enChars: 19, voiceMs: 2300 })).toBe(3200);
  expect(storyCallHoldMs({ koChars: 2, enChars: 0, voiceMs: 600 })).toBe(2400);
  // 글: 1600 + 90 · 한국어 + 30 · 영어, 2.8 ~ 7초.
  expect(storyCallHoldMs({ koChars: 4, enChars: 0, voiceMs: null })).toBe(2800);
  expect(storyCallHoldMs({ koChars: 18, enChars: 60, voiceMs: null })).toBe(5020);
  expect(storyCallHoldMs({ koChars: 80, enChars: 200, voiceMs: null })).toBe(7000);
});

test("SC4. 소리가 있는 줄은 소리 주소와 소리 길이 기반 시간을, 없는 줄은 null과 글 기반 시간을 싣는다", () => {
  const [first, voiced] = storyCallViewOf(call, port).lines;
  expect(first.audioSource).toBeNull();
  expect(first.holdMs).toBe(storyCallHoldMs({ koChars: 13, enChars: 20, voiceMs: null }));
  expect(voiced?.audioSource).not.toBeNull();
  expect(voiced?.holdMs).toBe(3200);
});

test("SC3. 통화 시계는 mm:ss", () => {
  expect(formatCallClock(0)).toBe("00:00");
  expect(formatCallClock(7)).toBe("00:07");
  expect(formatCallClock(83)).toBe("01:23");
});
