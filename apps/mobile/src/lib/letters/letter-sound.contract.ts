// 글자 소리를 내는 포트입니다(ADR-0169). Letters와 입장 전 기초가 함께 씁니다. 타입만 둡니다.

/** 음절 → 재생 주소(없으면 null = 아직 소리 없음) · 재생. 결선이 실제 재생 모듈을 꽂습니다. */
export type LetterSoundPort = {
  /** 음절 소리(합치기 퀴즈의 가 · 너 · 도) — 버킷 음성입니다. */
  readonly sourceOf: (syllable: string) => string | null;
  /** 자모 칸 하나의 소리(ㄱ · ㅏ …) — 앱 내장 녹음입니다(`jamoClipOf`, 2026-11-23). */
  readonly letterSourceOf: (letter: string) => string | null;
  readonly play: (source: string) => void;
};
