// 「아직 오디오 없음」 재생 조작의 계약입니다. 타입만 둡니다.

export type AudioUnavailableControlProps = {
  readonly testId: string;
  /** 아이콘입니다 — 기본은 재생 삼각형(Letters), 다시 듣기 자리는 스피커(ADR-0189). */
  readonly icon?: string;
  /** 면 크기입니다 — `l`(기본) 44 · 아이콘 24, `m` 36 · 아이콘 18(레슨 판정 줄, ADR-0189). */
  readonly size?: "m" | "l";
  /**
   * 면 톤입니다 — `light`(기본) 밝은 회색 면 · 짙은 아이콘에 비활성 불투명도, `dialog` 대사 상자와 같은 짙은 면(gray-950) · 흐린
   * 아이콘(gray-800, 불투명도 없음 — 면이 비치지 않게). 이야기 컷 다시 듣기 자리가 씁니다(ADR-0188 개정 D7 · ADR-0189).
   */
  readonly tone?: "light" | "dialog";
};

export type AudioUnavailableCopy = { readonly label: string };

/** 지나간 문장 다시 듣기 단추의 문구입니다(ADR-0189). */
export type SentenceReplayCopy = { readonly label: string };
