// 영어 복수형 도우미입니다. 영어 표 파일만 씁니다 — 다른 언어는 자기 규칙을 씁니다.

/** `1 gem` / `5 gems` — 수와 단위를 함께 냅니다. */
export function n(count: number, one: string, other: string): string {
  return `${count} ${count === 1 ? one : other}`;
}
