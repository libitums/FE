// 목록 요약 `companion_list_characters` 응답을 목록 맞추기 값으로 풉니다 — 순수, 던지지 않습니다.
// 인물 id → 그 대화의 서버 `lastMessageAt`(대화가 없으면 null). 서버는 답 · 선톡 · 스토리 반응 · 첫 인사를 넣을 때 이 값을 바꿉니다.

/** 응답이 없거나 배열이 아니면 null. 틀린 줄(id가 문자열이 아님)은 건너뜁니다. */
export function lastMessagesFrom(body: string | null): ReadonlyMap<string, string | null> | null {
  if (body === null) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return null;
  }
  if (!Array.isArray(parsed)) return null;
  const out = new Map<string, string | null>();
  for (const row of parsed as unknown[]) {
    if (typeof row !== "object" || row === null) continue;
    const { id, lastMessageAt } = row as { id?: unknown; lastMessageAt?: unknown };
    if (typeof id !== "string") continue;
    out.set(id, typeof lastMessageAt === "string" ? lastMessageAt : null);
  }
  return out;
}
