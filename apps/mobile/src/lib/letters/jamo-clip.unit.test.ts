import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

import { COMPOSE_ROUNDS, composeClipOf } from "./compose-quiz";
import { JAMO_GROUPS, composeSyllable, jamoClipOf } from "./jamo";

// `unit` 계층: 자모 칸을 누르면 나는 앱 내장 소리(2026-11-23). 녹음은 자음 18개(`c-<로마자>-sound`) · 모음 21개
// (`v-<로마자>`)이고 호스트 음성 폴더에 `hangul-` 이름으로 싣습니다. ㅇ은 따로 녹음이 없어 지금처럼 「아」(모음 ㅏ)를 냅니다.

const root = join(__dirname, "../../../../..");

describe("자모 내장 소리", () => {
  test("JC1. 자음은 그 자음의 소리, 모음은 그 모음의 소리", () => {
    expect(jamoClipOf("ㄱ")).toBe("hangul-c-g-sound");
    expect(jamoClipOf("ㄲ")).toBe("hangul-c-kk-sound");
    expect(jamoClipOf("ㅊ")).toBe("hangul-c-ch-sound");
    expect(jamoClipOf("ㅏ")).toBe("hangul-v-a");
    expect(jamoClipOf("ㅢ")).toBe("hangul-v-ui");
    expect(jamoClipOf("ㅝ")).toBe("hangul-v-wo");
  });

  test("JC2. ㅇ은 자기 녹음 「으」(c-ng-sound) — 다른 자음과 같은 「자음 + ㅡ」 규칙(2026-11-23)", () => {
    expect(jamoClipOf("ㅇ")).toBe("hangul-c-ng-sound");
  });

  test("JC3. 자모가 아니면 null", () => {
    expect(jamoClipOf("가")).toBeNull();
    expect(jamoClipOf("")).toBeNull();
    expect(jamoClipOf("a")).toBeNull();
  });

  test("JC4. 자모표 40자 모두 소리가 있고, 그 파일이 호스트 음성 폴더에 있다", () => {
    const letters = JAMO_GROUPS.flatMap((group) => group.letters.map((letter) => letter.letter));
    expect(letters).toHaveLength(40);
    for (const letter of letters) {
      const clip = jamoClipOf(letter);
      expect(clip, letter).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      expect(existsSync(join(root, "apps/ios/Host/audio", `${String(clip)}.m4a`)), letter).toBe(
        true,
      );
    }
  });
});

// 합치기 퀴즈의 음절(가 · 너 · 도)도 앱 내장 녹음입니다(2026-11-24) — 버킷 `staging/audio/hangul/s-<로마자>.m4a`를
// `hangul-s-<로마자>`로 실었습니다. ▶와 정답 뒤 음절 소리가 이 이름을 냅니다.
describe("합치기 퀴즈 음절 내장 소리", () => {
  test("JC5. 라운드 음절 가 · 너 · 도는 hangul-s-<로마자>", () => {
    expect(composeClipOf("가")).toBe("hangul-s-ga");
    expect(composeClipOf("너")).toBe("hangul-s-neo");
    expect(composeClipOf("도")).toBe("hangul-s-do");
  });

  test("JC6. 라운드 음절이 아니면 null — 자모 · 다른 음절 · 빈 값", () => {
    for (const other of ["ㄱ", "ㅏ", "나", "거", "가가", ""])
      expect(composeClipOf(other), other).toBeNull();
  });

  test("JC7. 세 라운드 음절 모두 녹음이 있고, 그 파일이 호스트 음성 폴더에 있다", () => {
    expect(COMPOSE_ROUNDS).toHaveLength(3);
    for (const round of COMPOSE_ROUNDS) {
      const syllable = composeSyllable(round.consonant, round.vowel);
      const clip = composeClipOf(syllable);
      expect(clip, syllable).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      expect(existsSync(join(root, "apps/ios/Host/audio", `${String(clip)}.m4a`)), syllable).toBe(
        true,
      );
    }
  });
});
