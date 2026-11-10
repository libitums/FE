// 메신저 채팅 문구표가 언어마다 같이 쓰는 조립 도구입니다(문구가 아니라 모양 규칙).

/** 낭독 조각을 구분자로 잇되 비었거나 null인 조각은 건너뜁니다. */
export function joinSpoken(parts: readonly (string | null)[], separator: string = ", "): string {
  return parts.filter((part): part is string => part !== null && part !== "").join(separator);
}

/** 24시간 "h:mm"입니다(예: 10:24, 9:05). */
export function clockLabel(hours: number, minutes: number): string {
  return `${hours}:${String(minutes).padStart(2, "0")}`;
}
