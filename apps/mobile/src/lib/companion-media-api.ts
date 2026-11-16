// 메신저 사진 · 음성이 서버에 닿는 길입니다(ADR-0146 「앱 연결」) — 요청(Edge Function) · 상태(RPC) · 서명 URL(Storage) · 지갑(RPC).
// **어떤 경우에도 던지지 않습니다** — 로그인 · 설정이 없거나 응답이 틀리면 failed · null. background 스레드(출처의 비동기 일)에서만 부릅니다.

import type { HttpRequestInit, SupabaseConfig } from "./auth-session.contract";
import { bearerHeaders } from "./auth-request";
import { isSuccessStatus, type AuthRequestOutcome } from "./supabase-transport";
import type { ChatMediaRemote } from "../screens/messenger-chat/chat-media.contract";
import {
  mediaListFrom,
  mediaPageFrom,
  mediaRequestFrom,
  signedUrlFrom,
  walletBalanceFrom,
} from "../screens/messenger-chat/companion-media-parse";

/** 서명 URL의 수명(초) — 방에 하루 머물러도 그림 · 소리가 풀리게. 방을 다시 열면 새로 받습니다. */
export const MEDIA_SIGN_SECONDS = 86_400;
const BUCKET = "companion-media";

export type CompanionMediaDeps = {
  readonly token: () => Promise<string | null>;
  readonly config: () => SupabaseConfig | null;
  readonly post: (
    build: (config: SupabaseConfig) => { url: string; init: HttpRequestInit },
  ) => Promise<AuthRequestOutcome>;
  readonly now: () => number;
};

/** 경로 조각마다 인코딩합니다(`<user id>/<media id>.png` — 빗금은 그대로). */
const encodePath = (path: string) => path.split("/").map(encodeURIComponent).join("/");

export function createCompanionMediaRemote(deps: CompanionMediaDeps): ChatMediaRemote {
  /** 토큰이 없거나 던지면 null, 아니면 전송 결과 그대로. */
  const post = async (path: string, body: unknown): Promise<AuthRequestOutcome | null> => {
    try {
      const token = await deps.token();
      if (token === null) return null;
      return await deps.post((config) => ({
        url: `${config.url}${path}`,
        init: { method: "POST", headers: bearerHeaders(config, token), body: JSON.stringify(body) },
      }));
    } catch {
      return null;
    }
  };
  const bodyOf = (outcome: AuthRequestOutcome | null): string | null =>
    outcome !== null && outcome.ok && isSuccessStatus(outcome.status) ? outcome.bodyText : null;

  // 서버는 요청을 받는 순간 프로필의 내 모습을 읽습니다 — 저장 중이면 끝난 뒤에 요청합니다(ADR-0150 D5, 리뷰 #446).
  let saving: Promise<unknown> = Promise.resolve();
  return {
    request: async (kind, messageId, again) => {
      await saving;
      const outcome = await post(`/functions/v1/companion-${kind}`, {
        message_id: messageId,
        ...(again === true ? { again: true } : {}),
      });
      if (outcome === null || !outcome.ok) return { kind: "failed" };
      return mediaRequestFrom(outcome.status, outcome.bodyText, deps.now());
    },
    load: async (query) =>
      mediaListFrom(
        bodyOf(
          await post("/rest/v1/rpc/companion_get_media", {
            p_ids: query.ids === undefined ? null : [...query.ids],
            p_message_ids: query.messageIds === undefined ? null : [...query.messageIds],
          }),
        ),
      ),
    sign: async (path) => {
      const body = bodyOf(
        await post(`/storage/v1/object/sign/${BUCKET}/${encodePath(path)}`, {
          expiresIn: MEDIA_SIGN_SECONDS,
        }),
      );
      const config = deps.config();
      return config === null ? null : signedUrlFrom(body, `${config.url}/storage/v1`);
    },
    list: async ({ characterId, before, limit }) =>
      mediaPageFrom(
        bodyOf(
          await post("/rest/v1/rpc/companion_list_media", {
            p_character_id: characterId,
            p_kind: null,
            p_before: before === null ? null : new Date(before).toISOString(),
            p_limit: limit,
          }),
        ),
      ),
    // 나머지 칸은 null — 그 열을 바꾸지 않습니다(생년 · 출처는 함께 null이어야 함).
    saveSelf: (self) => {
      const saved = post("/rest/v1/rpc/companion_save_profile", {
        p_birth_year: null,
        p_age_source: null,
        p_l1: null,
        p_feedback_mode: null,
        p_snapshot_self: self,
      }).then((outcome) => bodyOf(outcome) !== null);
      saving = saved;
      return saved;
    },
    balance: async () =>
      walletBalanceFrom(bodyOf(await post("/rest/v1/rpc/companion_get_wallet", {}))),
  };
}
