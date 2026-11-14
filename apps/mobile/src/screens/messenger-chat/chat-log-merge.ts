// 서버 기록과 앱 로그를 합칩니다(ADR-0138) — 순수. 같은 id는 서버 판, 앱에만 있는 줄(보내지 못한 글 · 회색 줄)은
// 공통 줄 사이면 그 자리(앞 공통 줄 뒤), 앞 공통 줄이 없으면 뒤 공통 줄 앞, 마지막 공통 줄 뒤면 끝에 둡니다.

import type { ChatMessage } from "./chat-source.contract";

export function mergeLog(
  appLog: readonly ChatMessage[],
  remote: readonly ChatMessage[],
): ChatMessage[] {
  const remoteIds = new Set(remote.map((message) => message.id));
  const local = dropServerKnown(appLog, remote);
  const after = new Map<string | null, ChatMessage[]>(); // 공통 줄 id(null = 맨 앞) → 그 뒤에 둘 앱 전용 줄
  const tail: ChatMessage[] = [];
  let anchor: string | null | undefined; // undefined = 아직 공통 줄을 못 만남
  let pending: ChatMessage[] = [];
  for (const message of local) {
    if (remoteIds.has(message.id)) {
      // 공통 줄 전에 모인 앱 전용 줄 — 앞 공통 줄이 없으면 이 줄 앞(= 이 줄의 서버 앞 줄 뒤)에 둡니다.
      if (pending.length > 0) {
        const key = anchor === undefined ? `before:${message.id}` : anchor;
        after.set(key, [...(after.get(key) ?? []), ...pending]);
        pending = [];
      }
      anchor = message.id;
    } else pending.push(message);
  }
  // 마지막 공통 줄 뒤의 앱 전용 줄(보내지 못한 글 등)은 서버 기록보다 새것이라 끝에 둡니다.
  tail.push(...pending);
  const out: ChatMessage[] = [];
  for (const message of remote) {
    out.push(
      ...(after.get(`before:${message.id}`) ?? []),
      message,
      ...(after.get(message.id) ?? []),
    );
  }
  return [...out, ...tail];
}

// 회색 줄 · 위기 카드처럼 앱이 턴에서 만든 줄 가운데, 서버도 notice 행으로 저장하는 고지(`<내 글 id>~n<번호>`)만 겹칩니다.
const TURN_NOTICE = /^(.+)~n\d+$/;

/** 그 내 글의 턴에 서버가 저장한 고지가 섰는지 — 내 글 뒤, 다음 내 글 전에 notice 행이 있으면. */
function hasServerNotice(remote: readonly ChatMessage[], ownerId: string): boolean {
  const index = remote.findIndex((m) => m.id === ownerId);
  if (index < 0) return false;
  for (const m of remote.slice(index + 1)) {
    if (m.kind === "text" && m.from === "me") return false;
    if (m.kind === "notice") return true;
  }
  return false;
}

/**
 * 기록 합치기 전에 버릴 앱 줄 — 그 턴의 고지를 서버가 notice 행(다른 id)으로 저장했으면 앱 판을 버립니다. 서버는 턴이 끝날 때
 * 고지를 넣으므로 아직 없으면 앱 판을 남깁니다(고지가 잠깐 사라지지 않게, 리뷰 N3).
 */
export function dropServerKnown(
  local: readonly ChatMessage[],
  remote: readonly ChatMessage[],
): ChatMessage[] {
  const remoteIds = new Set(remote.map((m) => m.id));
  return local.filter((message) => {
    const owner = TURN_NOTICE.exec(message.id)?.[1];
    return owner === undefined || remoteIds.has(message.id) || !hasServerNotice(remote, owner);
  });
}

/** 보내지 못한 글이 사실 서버에 있으면 그 서버 id — 같은 글, 2분 안, 아직 로그에 없는 id(리뷰 W4). */
export function serverCopyOf(
  local: ChatMessage,
  remote: readonly ChatMessage[],
  shown: ReadonlySet<string>,
): string | null {
  if (local.kind !== "text" || local.from !== "me") return null;
  const copy = remote.find(
    (m) =>
      m.kind === "text" &&
      m.from === "me" &&
      !shown.has(m.id) &&
      m.text.ko === local.text.ko &&
      Math.abs(m.at - local.at) <= 120_000,
  );
  return copy?.id ?? null;
}

/**
 * 그 내 글의 턴이 서버에서 끝났는지 — 뒤에 무엇이든(캐릭터 말 · 고지) 섰으면 끝난 것으로 봅니다. 답 없이 끝나는 턴(차단 ·
 * 위기)도 채우기가 stalled로 남지 않게(리뷰 N2).
 */
export function hasReplyAfter(remote: readonly ChatMessage[], messageId: string): boolean {
  const index = remote.findIndex((m) => m.id === messageId);
  return index >= 0 && index < remote.length - 1;
}

/** 추천 답변 보기가 같은지 — 다시 읽을 때 같은 보기로 판이 다시 열리지 않게(리뷰 W3). */
export function sameIdeas(
  a: readonly { readonly ko: string; readonly roman: string; readonly en: string }[] | null,
  b: readonly { readonly ko: string; readonly roman: string; readonly en: string }[] | null,
): boolean {
  if (a === null || b === null) return a === b;
  return (
    a.length === b.length &&
    a.every((x, i) => x.ko === b[i]?.ko && x.roman === b[i]?.roman && x.en === b[i]?.en)
  );
}
