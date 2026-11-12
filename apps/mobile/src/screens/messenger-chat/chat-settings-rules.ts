// 대화 설정의 순수 규칙입니다(ADR-0126) — 먼저 보내는 메시지의 시각 · 기억 글 · 상한. DOM · 네트워크를 만지지 않습니다.

/** 고를 수 있는 시각입니다(현지 시). null = 아무 때나. 서버는 0~23시를 받으니 그대로 넘깁니다. */
export const PROACTIVE_HOURS: readonly (number | null)[] = [null, 9, 12, 18, 21];

/** 기억 한 줄의 최대 글자 수(서버 `companion_update_memory`와 같다). */
export const MEMORY_MAX_LENGTH = 500;
/** 층마다의 상한 초안(서버 `shared_memory_cap` · `memory_cap`). */
export const SHARED_MEMORY_CAP = 30;
export const CHARACTER_MEMORY_CAP = 50;

/** 앞뒤 공백을 걷어 1~500자면 그 글, 아니면 null입니다. 길이는 code point로 셉니다. */
export function normalizeMemoryText(text: string): string | null {
  const trimmed = text.trim();
  const length = [...trimmed].length;
  return length >= 1 && length <= MEMORY_MAX_LENGTH ? trimmed : null;
}
