// 추천 답변 칩(계정 설정 `replyIdeas`)의 저장입니다(ADR-0156). 사이드바 토글 · 설정 탭 Chats의 같은 값입니다. 던지지 않습니다.
// - 시작: 기기에 적힌 값(계정마다) → 씨앗. 서버 방이면 `companion_load_profile`의 `replySuggestions`가 이깁니다(다른 기기 · 재설치).
// - 바꾸면 기기에 적고, 서버 방이면 `companion_save_profile(p_reply_suggestions)`로 보냅니다 — 서버는 꺼진 계정에 칩을 만들지 않습니다.
// - 읽는 동안 학습자가 바꾼 값이 이깁니다.

import { getItem, setItem } from "../../lib/storage";
import type { ChatProfileRemote } from "./chat-remote.contract";

/** 기기 저장 — `{ <출처 키>: boolean }`(계정마다). */
export const REPLY_IDEAS_KEY = "libitum.messenger.reply-ideas";

export type ReplyIdeasStore = {
  readonly read: () => boolean | null;
  readonly write: (on: boolean) => void;
};

export type ReplyIdeasSync = {
  /** 처음 값 — 기기에 적힌 값이 없으면 null(씨앗 그대로). */
  readonly initial: boolean | null;
  /** 학습자가 바꿨습니다. */
  readonly changed: (on: boolean) => void;
  /** 서버 값이 오면(학습자가 아직 안 바꿨을 때만) 부릅니다. */
  readonly onLoaded: (apply: (on: boolean) => void) => void;
};

export function replyIdeasSync(
  store: ReplyIdeasStore | undefined,
  profile: ChatProfileRemote | undefined,
): ReplyIdeasSync {
  let initial: boolean | null = null;
  try {
    initial = store?.read() ?? null;
  } catch {
    initial = null;
  }
  let touched = false;
  const loaded = profile?.load().catch(() => null) ?? Promise.resolve(null);
  return {
    initial,
    changed: (on) => {
      touched = true;
      try {
        store?.write(on);
      } catch {
        // 기기 저장 실패 — 서버 값이 다음 실행에 맞춥니다.
      }
      void profile?.saveReplySuggestions?.(on).catch(() => false);
    },
    onLoaded: (apply) => {
      void loaded.then((value) => {
        const on = value?.replySuggestions;
        if (touched || typeof on !== "boolean") return;
        try {
          store?.write(on);
        } catch {
          // 위와 같음.
        }
        apply(on);
      });
    },
  };
}

function readAll(): Record<string, unknown> {
  try {
    const raw: unknown = JSON.parse(getItem(REPLY_IDEAS_KEY) ?? "null");
    return typeof raw === "object" && raw !== null && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

/** 기기의 추천 답변 설정 — 계정(출처 키 「fixture」 · 「server:<id>」)마다 따로. */
export function deviceReplyIdeasStore(accountKey: string): ReplyIdeasStore {
  return {
    read: () => {
      const value = readAll()[accountKey];
      return typeof value === "boolean" ? value : null;
    },
    write: (on) => {
      try {
        setItem(REPLY_IDEAS_KEY, JSON.stringify({ ...readAll(), [accountKey]: on }));
      } catch {
        // 저장소가 없으면 이번 실행만.
      }
    },
  };
}
