// 조립 문항(음절 조립 · 문장 조립)의 힌트와 타일 로마자 계약입니다(팀 요청 ①②③, ADR-0153). 타입과 순수 함수만 둡니다.

/** 힌트 시트에서 고른 것 — `show`(정답 보기)가 `listen`(정답 듣기)보다 앞섭니다. */
export type HintUse = "listen" | "show";

/** 문항의 힌트입니다. `listenSource`가 없으면 「정답 듣기」 줄이 서지 않습니다. */
export type AssembledHint = {
  /** 정답 보기에서 흐리게 깔 글자 — 음절 조립은 칸마다 한 조각, 문장 조립은 문장 하나입니다. */
  readonly ghost: readonly string[];
  readonly listenSource?: string;
};

/** 창고 타일의 로마자입니다. `review`는 레슨 끝 다시 풀기에서만 섭니다(듣고 조립). */
export type TileReading = {
  /** 타일 표시 순서와 같은 길이 · 같은 순서입니다. */
  readonly values: readonly string[];
  readonly shown: "always" | "review";
};

/** 이 문항에 지금 쓴 힌트 기록 — 더 센 쪽이 남습니다(정답 보기 > 정답 듣기). */
export function strongerHint(current: HintUse | null, next: HintUse): HintUse {
  return current === "show" || next === "show" ? "show" : "listen";
}

/** 타일 로마자를 지금 보일지 — 다시 풀기 전용은 다시 풀기 화면에서만입니다. */
export function tileRomanizationsShown(
  reading: TileReading | undefined,
  inReview: boolean,
): readonly string[] | null {
  if (reading === undefined) return null;
  return reading.shown === "always" || inReview ? reading.values : null;
}

/** 모든 타일에 로마자가 있을 때만 읽기를 만듭니다 — 하나라도 비면 섞어 보이지 않습니다. */
export function tileReadingOf(
  romans: readonly (string | undefined)[],
  shown: TileReading["shown"],
): TileReading | undefined {
  if (romans.length === 0) return undefined;
  const values = romans.filter((roman): roman is string => roman !== undefined && roman !== "");
  return values.length === romans.length ? { values, shown } : undefined;
}
