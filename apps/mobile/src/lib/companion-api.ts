// 메신저가 컴패니언 서버에 닿는 길입니다(ADR-0137) — 기록(RPC) · 첫 인사(Edge Function) · 턴(chat-send SSE, 호스트 모듈 ADR-0124).
// **어떤 경우에도 던지지 않습니다** — 로그인 · 설정이 없거나 응답이 틀리면 null, 턴은 onEnd 한 번.

import type { HttpRequestInit, SupabaseConfig } from "./auth-session.contract";
import { bearerHeaders } from "./auth-request";
import type { ChatStreamClient } from "./chat-stream.contract";
import { chatStreamClient } from "./chat-stream";
import { readNetworkProperties } from "./network-status";
import { currentAccessToken } from "./progress-api";
import { supabaseConfig } from "./supabase-config";
import { isSuccessStatus, send, type AuthRequestOutcome } from "./supabase-transport";
import type { ChatRemote } from "../screens/messenger-chat/chat-remote.contract";
import { greetingFrom, historyFrom } from "../screens/messenger-chat/companion-parse";

/** 서버 계약 판(`@libitums/companion-contract`의 CONTRACT_VERSION). 값을 가져오면 zod가 번들에 들어가 숫자만 둡니다. */
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
    loadHistory: async (characterId) =>
      historyFrom(
        await call("/rest/v1/rpc/companion_list_messages", {
          p_character_id: characterId,
          p_before: null,
          p_limit: HISTORY_PAGE,
        }),
      ),
    greet: async (characterId) =>
      greetingFrom(
        await call("/functions/v1/companion-greet", { character_id: characterId }),
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
