// 「Get closer」 시트(ADR-0164 D4)를 이 계정에 이미 보였는지의 기기 저장입니다(계정마다). lib/storage의 getItem · setItem만 씁니다.
// 「Sounds good」은 서버 동의(`adultAck`)로 남고, 「Just friends for now」는 이 표시로만 남습니다 — 둘 다 다시 묻지 않게.
// 실패는 삼키고 이번 실행만 메모리로 갑니다.

import { getItem, setItem } from "../../lib/storage";

/** `{ <출처 키>: true }`(계정마다). */
export const ADULT_ACK_ASKED_KEY = "libitum.messenger.adult-ack-asked";

export type AdultAckAskedStore = {
  readonly asked: () => boolean;
  readonly markAsked: () => void;
};

function askedMap(): Record<string, unknown> {
  try {
    const text = getItem(ADULT_ACK_ASKED_KEY);
    const raw = text === null ? null : (JSON.parse(text) as unknown);
    return typeof raw === "object" && raw !== null && !Array.isArray(raw)
      ? { ...(raw as Record<string, unknown>) }
      : {};
  } catch {
    return {};
  }
}

export function deviceAdultAckAskedStore(accountKey: string): AdultAckAskedStore {
  let cache: boolean | null = null;
  return {
    asked: () => {
      cache ??= askedMap()[accountKey] === true;
      return cache;
    },
    markAsked: () => {
      cache = true;
      try {
        setItem(ADULT_ACK_ASKED_KEY, JSON.stringify({ ...askedMap(), [accountKey]: true }));
      } catch {
        // 이번 실행만 메모리로 — 다음 실행에 한 번 더 물을 뿐입니다.
      }
    },
  };
}
