// 메신저가 컴패니언 서버에 닿는 길입니다(ADR-0137) — 기록(RPC) · 첫 인사(Edge Function) · 턴(chat-send SSE, 호스트 모듈 ADR-0124).
// **어떤 경우에도 던지지 않습니다** — 로그인 · 설정이 없거나 응답이 틀리면 null, 턴은 onEnd 한 번.

import type { HttpRequestInit, SupabaseConfig } from "./auth-session.contract";
import { bearerHeaders } from "./auth-request";
import type { ChatStreamClient } from "./chat-stream.contract";
import { chatStreamClient } from "./chat-stream";
import { createCompanionMediaRemote } from "./companion-media-api";
import { readNetworkProperties } from "./network-status";
import { currentAccessToken } from "./progress-api";
import { supabaseConfig } from "./supabase-config";
import { isSuccessStatus, send, type AuthRequestOutcome } from "./supabase-transport";
import type { ChatRemote } from "../screens/messenger-chat/chat-remote.contract";
import {
  clearOutcomeFrom,
  greetingFrom,
  historyFrom,
  profileFrom,
  profileL1From,
} from "../screens/messenger-chat/companion-parse";
import { walletOf } from "../screens/messenger-chat/companion-media-parse";
import { earlyOffersFrom, earlyUnlockFrom } from "../screens/messenger-chat/early-access-parse";
import { friendStoriesFrom } from "../screens/messenger-chat/friend-stories-parse";
import {
  adultAckFrom,
  visibleFriendsFrom,
} from "../screens/messenger-chat/companion-friends-parse";

/** 서버 계약 판(`@libitums/companion-contract`의 CONTRACT_VERSION). 값을 가져오면 zod가 번들에 들어가 숫자만 둡니다. */

// Lynx 배경 스레드(PrimJS)에는 `Promise.allSettled`가 없습니다 — 끝나면(성공 · 실패) 이어지는 약속을 직접 만듭니다.
// 새 저장은 앞선 저장을 기다린 뒤 나가므로, 새 저장이 끝나는 것만 기다리면 앞선 저장도 끝나 있습니다.
const settled = (promise: Promise<unknown>): Promise<void> =>
  promise.then(
    () => undefined,
    () => undefined,
  );

export const COMPANION_CONTRACT_VERSION = 1;
/** 방을 열 때 읽는 기록 수입니다(최근부터). */
export const HISTORY_PAGE = 30;

export type CompanionRemoteDeps = {
  readonly token: () => Promise<string | null>;
  readonly config: () => SupabaseConfig | null;
  readonly post: (
    build: (config: SupabaseConfig) => { url: string; init: HttpRequestInit },
  ) => Promise<AuthRequestOutcome>;
  readonly stream: () => ChatStreamClient;
  readonly now: () => number;
  /** 기기가 오프라인인지(ADR-0138) — 참이면 스트림을 열지 않고 network로 끝냅니다. 없으면 늘 연결된 것으로. */
  readonly isOffline?: () => boolean;
};

const postJson =
  (path: string, token: string, body: unknown) =>
  (config: SupabaseConfig): { url: string; init: HttpRequestInit } => ({
    url: `${config.url}${path}`,
    init: { method: "POST", headers: bearerHeaders(config, token), body: JSON.stringify(body) },
  });

export function createCompanionRemote(deps: CompanionRemoteDeps): ChatRemote {
  // 서버는 턴 · 사진 요청을 받는 순간 프로필의 생년으로 나이를 판정합니다 — 생년 저장 중이면 끝난 뒤에 보냅니다(ADR-0125).
  let profileSaving: Promise<unknown> = Promise.resolve();
  // 사진 · 음성(ADR-0146 「앱 연결」)은 같은 토큰 · 설정 · 전송을 씁니다.
  const media = createCompanionMediaRemote({ ...deps, profileSaved: () => profileSaving });
  const call = async (path: string, body: unknown): Promise<string | null> => {
    try {
      const token = await deps.token();
      if (token === null) return null;
      const outcome = await deps.post(postJson(path, token, body));
      return outcome.ok && isSuccessStatus(outcome.status) ? outcome.bodyText : null;
    } catch {
      return null;
    }
  };

  return {
    media,
    wallet: async () => walletOf(await call("/rest/v1/rpc/companion_get_wallet", {})),
    // 엽전 먼저 만나기(20261213, ADR-0162 D5).
    earlyAccess: {
      offers: async () =>
        earlyOffersFrom(await call("/rest/v1/rpc/companion_early_access_offers", {})),
      unlock: async (characterId) =>
        earlyUnlockFrom(
          await call("/rest/v1/rpc/companion_unlock_early", { p_character_id: characterId }),
        ),
    },
    // 추천 친구(20261216, ADR-0164) — 보이는 친구 · 성인 확인 동의.
    friends: {
      visible: async () => visibleFriendsFrom(await call("/rest/v1/rpc/companion_friends", {})),
      ackAdult: async () => adultAckFrom(await call("/rest/v1/rpc/companion_ack_adult", {})),
    },
    // 친구 스토리(ADR-0177 D2) — 함수가 없는 서버(배포 전)는 404 → null(스토리 없음).
    stories: {
      list: async () => friendStoriesFrom(await call("/rest/v1/rpc/companion_friend_stories", {})),
    },
    clearChat: async (characterId) =>
      clearOutcomeFrom(
        await call("/rest/v1/rpc/companion_clear_chat", { p_character_id: characterId }),
      ),
    profile: {
      load: async () => profileFrom(await call("/rest/v1/rpc/companion_load_profile", {})),
      // 나머지 칸은 null — 그 열을 바꾸지 않습니다. 출처는 학습자가 직접 고른 값(`self`).
      // 프로필 저장은 차례대로 — 앞선 저장(언어 맞추기 등)이 끝난 뒤 나가고, 턴은 둘 다 기다립니다.
      saveBirthYear: (year) => {
        const before = profileSaving;
        const saved = before.then(() =>
          call("/rest/v1/rpc/companion_save_profile", {
            p_birth_year: year,
            p_age_source: "self",
            p_l1: null,
            p_feedback_mode: null,
          }).then((body) => body !== null),
        );
        profileSaving = settled(saved);
        return saved;
      },
      saveReplySuggestions: (on) =>
        call("/rest/v1/rpc/companion_save_profile", {
          p_birth_year: null,
          p_age_source: null,
          p_l1: null,
          p_feedback_mode: null,
          p_reply_suggestions: on,
        }).then((body) => body !== null),
      // 학습자 언어(2026-11-17) — 서버 l1이 같으면 쓰지 않습니다. 맞추는 동안의 턴 · 사진 요청은 끝난 뒤 나갑니다.
      syncL1: (l1) => {
        const before = profileSaving;
        const synced = (async () => {
          await before;
          const stored = profileL1From(await call("/rest/v1/rpc/companion_load_profile", {}));
          if (stored === l1) return true;
          const body = { p_birth_year: null, p_age_source: null, p_l1: l1, p_feedback_mode: null };
          return (await call("/rest/v1/rpc/companion_save_profile", body)) !== null;
        })();
        profileSaving = settled(synced);
        return synced;
      },
    },
    loadHistory: async (characterId) =>
      historyFrom(
        await call("/rest/v1/rpc/companion_list_messages", {
          p_character_id: characterId,
          p_before: null,
          p_limit: HISTORY_PAGE,
        }),
      ),
    greet: async (characterId, trigger) =>
      greetingFrom(
        await call("/functions/v1/companion-greet", {
          character_id: characterId,
          ...(trigger === undefined ? {} : { trigger }),
        }),
        deps.now(),
      ),
    openTurn: (request, handlers) => {
      let cancelled = false;
      let cancelStream: (() => void) | null = null;
      let ended = false;
      const end = (reason: string, detail: string | null) => {
        if (ended) return;
        ended = true;
        handlers.onEnd(reason, detail);
      };
      void (async () => {
        try {
          await profileSaving;
          const token = await deps.token();
          const config = deps.config();
          if (cancelled) return end("cancelled", null);
          if (deps.isOffline?.() === true) return end("network", null);
          if (token === null || config === null)
            return end("http-error", JSON.stringify({ error: "invalid_session" }));
          const handle = deps.stream().open(
            {
              url: `${config.url}/functions/v1/chat-send`,
              headers: { ...bearerHeaders(config, token), Accept: "text/event-stream" },
              body: JSON.stringify({
                contract_version: COMPANION_CONTRACT_VERSION,
                character_id: request.characterId,
                client_message_id: request.clientMessageId,
                text: request.text,
                input_mode: "text",
                ...(request.storyId === undefined ? {} : { story_id: request.storyId }),
              }),
            },
            {
              onOpen: handlers.onOpen,
              onEvent: (event) => handlers.onEvent(event.event, event.data),
              onEnd: end,
            },
          );
          cancelStream = handle.cancel;
        } catch {
          end("network", null);
        }
      })();
      return {
        cancel: () => {
          cancelled = true;
          if (cancelStream === null) end("cancelled", null);
          else cancelStream();
        },
      };
    },
  };
}

/** 앱 결선 — 저장된 로그인 · 설정 · 호스트 SSE 모듈. background 스레드(이벤트 · 효과)에서만 부릅니다. */
export function companionRemote(): ChatRemote {
  return createCompanionRemote({
    token: () => currentAccessToken(),
    config: supabaseConfig,
    post: (build) => send(build, true),
    stream: chatStreamClient,
    now: Date.now,
    isOffline: () => readNetworkProperties().network === "offline",
  });
}
