import { describe, expect, test } from "vitest";

import {
  initialVoiceSample,
  sheetLineOf,
  VOICE_TAP_GUARD_MS,
  voiceSampleFinished,
  voiceSampleNeedsStop,
  voiceSampleStarted,
  voiceSampleTap,
} from "./profile-voice-sample";
import type { VoiceSampleState } from "./profile-voice-sample";
import { friend } from "./suggested-friends.test-support";

// `unit` 계층(PV-U1 ~ PV-U4): 견본 단추의 상태 · 연타 막기(ADR-0198 D2 · 시제품의 「첫 탭이 바로 일시정지」)와 첫 말 칸의 갈래.

const T0 = 1_000_000;
const pron = (romanization: string) => `Pronunciation: ${romanization}`;

describe("PV-U1 누름 — 듣기 → 일시정지 → 이어 듣기", () => {
  test("처음 누름은 play, 재생 중 누름은 pause, 멈춰 둔 뒤 누름은 resume", () => {
    const first = voiceSampleTap(initialVoiceSample, T0);
    expect(first.action).toBe("play");
    expect(first.next.phase).toBe("playing");

    const second = voiceSampleTap(first.next, T0 + VOICE_TAP_GUARD_MS);
    expect(second.action).toBe("pause");
    expect(second.next.phase).toBe("paused");

    const third = voiceSampleTap(second.next, T0 + 2 * VOICE_TAP_GUARD_MS);
    expect(third.action).toBe("resume");
    expect(third.next.phase).toBe("playing");
  });

  test("받아들인 누름 뒤 짧은 사이의 누름은 버린다(연타 · 이중 탭)", () => {
    const first = voiceSampleTap(initialVoiceSample, T0);
    const double = voiceSampleTap(first.next, T0 + VOICE_TAP_GUARD_MS - 1);
    expect(double.action).toBe("ignore");
    expect(double.next).toBe(first.next);
  });

  test("못 읽음 줄은 다시 누르면 지운다", () => {
    const failed: VoiceSampleState = { phase: "idle", unavailable: true, tappedAt: T0 };
    const again = voiceSampleTap(failed, T0 + VOICE_TAP_GUARD_MS);
    expect(again.action).toBe("play");
    expect(again.next.unavailable).toBe(false);
  });
});

describe("PV-U2 재생 결과 · 끝", () => {
  test("started는 그대로, unavailable은 처음 자리 + 못 읽음", () => {
    const playing = voiceSampleTap(initialVoiceSample, T0).next;
    expect(voiceSampleStarted(playing, "started")).toEqual(playing);
    expect(voiceSampleStarted(playing, "unavailable")).toEqual({
      phase: "idle",
      unavailable: true,
      tappedAt: T0,
    });
  });

  test("끝까지 들으면 처음 자리(Hear voice)로", () => {
    const playing = voiceSampleTap(initialVoiceSample, T0).next;
    expect(voiceSampleFinished(playing).phase).toBe("idle");
    expect(voiceSampleFinished(playing).unavailable).toBe(false);
  });
});

test("PV-U3 닫힐 때 멈춤 — 재생 중 · 멈춰 둠만", () => {
  const playing = voiceSampleTap(initialVoiceSample, T0).next;
  const paused = voiceSampleTap(playing, T0 + VOICE_TAP_GUARD_MS).next;
  expect(voiceSampleNeedsStop(initialVoiceSample)).toBe(false);
  expect(voiceSampleNeedsStop(playing)).toBe(true);
  expect(voiceSampleNeedsStop(paused)).toBe(true);
  expect(voiceSampleNeedsStop(voiceSampleFinished(playing))).toBe(false);
});

describe("PV-U4 첫 말 칸 — 견본 대본이 있으면 대본, 없으면 첫 말", () => {
  const script = {
    ko: "도윤이에요! 쉿! ㅎㅎ",
    roman: "doyunieyo! swit! hh",
    en: "I'm Doyun! Shh! Hehe.",
    th: "เรา Doyun! ชู่ว์! ฮิฮิ",
  };
  const withScript = friend("doyun", {
    voiceSamplePath: "content/audio/companion/doyun-intro.mp3",
    voiceSampleScript: script,
    sheetOpening: { ko: "안녕하세요! 카페 끌림 도윤이에요.", en: "Hi! It's Doyun." },
  });

  test("로마자 켬 — 대본 한글 + 콘텐츠 로마자 · 화면 언어 뜻 묶음", () => {
    expect(sheetLineOf(withScript, "th", "shown", pron)).toEqual({
      ko: script.ko,
      lines: {
        annotation: {
          romanization: script.roman,
          meaning: script.th,
          spokenRomanization: `Pronunciation: ${script.roman}`,
        },
      },
    });
  });

  test("로마자 끔 — 뜻 한 줄, 없는 언어는 en", () => {
    expect(sheetLineOf(withScript, "ja", "hidden", pron)).toEqual({
      ko: script.ko,
      lines: { translation: script.en },
    });
  });

  test("대본이 없으면 지금처럼 첫 말 + 뜻 한 줄(스위치와 무관 — 로마자 없음)", () => {
    const plain = friend("mina", {
      sheetOpening: { ko: "안녕하세요!", en: "Hi!", ja: "こんにちは！" },
    });
    expect(sheetLineOf(plain, "ja", "shown", pron)).toEqual({
      ko: "안녕하세요!",
      lines: { translation: "こんにちは！" },
    });
  });

  test("둘 다 없으면 null", () => {
    expect(sheetLineOf(friend("x", { sheetOpening: null }), "en", "shown", pron)).toBeNull();
  });
});
