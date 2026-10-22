// 듣기 활동의 문항 타입을 소유합니다(ADR-0006 D4 — 순수 로직은 unit 계층 대상입니다). UI를 import하지 않습니다.

import type { ListenAudio } from "../../lib/question-audio";

// ---------------------------------------------------------------- 도메인 타입

export type ListeningQuestion = {
  readonly prompt: string;
  /**
   * 제시문의 로마자 표기입니다(국어의 로마자 표기법). 제시문 아래 한 줄로 서서, 한글을
   * 아직 못 읽는 학습자가 소리를 눈으로 짚게 합니다(Figma 53-14231).
   *
   * ⚠ 이 값들은 손으로 적었고 **언어 담당의 검수를 받지 않았습니다.** 자음 동화 ·
   * 격음화가 걸리는 자리(`혹시 지하철역이` · `따뜻한` · `이 길로`)가 특히 그렇습니다.
   * 옵셔널이 아닌 것은 같은 이유입니다 — 빠진 문항이 타입에 생기면 그 자리가 조용히
   * 비어 버립니다.
   */
  readonly romanization: string;
  // 문항 음성입니다 — 소리가 없는 문항은 `null`로 **명시**합니다(카탈로그 문항 — 대본을 늘 보이고 재생 조작을
  // 끕니다). 옵셔널이 아닙니다: `audio?`면 "아직 없는 문항"이 타입에 생깁니다.
  readonly audio: ListenAudio | null;
  readonly instruction?: string;
  /** 대본이 가려진 동안에도 로마자 줄을 참고로 보일지입니다 — 소리 구별을 묻지 않는 듣고 고르기만 켭니다. */
  readonly romanizationHint?: boolean;
} & (
  | {
      readonly choices: readonly [string, string];
      readonly answerIndex: 0 | 1;
    }
  | {
      readonly choices: readonly [string, string, string, string];
      readonly answerIndex: 0 | 1 | 2 | 3;
    }
);
