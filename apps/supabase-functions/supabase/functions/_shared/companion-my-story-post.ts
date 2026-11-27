// 사진 스토리 올리기(ADR-0191 D11) — `companion-my-story`의 `post`. 요청 안에서 사진을 읽어 게시 · 거절 · 다시 보기를 정한다.
// 1. 문(`companion_my_photo_gate`): 스위치 · 성인 · 창 · 24시간 상한 · 하루 검수 시도. 같은 요청이 다시 오면 그 스토리(두 번 눌러도 하나).
// 2. 글 검수(입력 층): 사진 설명 + 직접 쓴 얹은 글(ADR-0191 D15 — 배운 단어는 넣지 않음, 글이 없으면 건너뜀). 막힌 글은 `text_blocked`.
//    위기 신호(글이든 사진 읽기든)는 올리지 않고 `crisis` + 그 지역의 상담 연락처(색 바탕과 같다).
// 3. 사진 읽기(검수 · 장면 설명, 기본 8초). 거절이면 사진을 격리 버킷으로 옮기고 거절을 적는다 — 창은 쓰지 않는다.
//    제때 끝나지 않거나 실패하면 `checking`으로 올린다(나에게만 보임) — 매분 도는 뒷정리(`companion-story-upkeep.ts`)가 다시 본다.
// 2와 3은 문을 지난 뒤 **겹쳐 돈다**(ADR-0191 D11 개정 ⟨겹쳐 읽기⟩ — 운영에서 글 검수 1.3 ~ 1.6초를 아낌). 판정 순서는 그대로다:
// 글(실패 · 막힘 · 위기)이 먼저, 그다음 사진 없음 · 내려받기 실패 · 거절 · 게시. 글이 막히거나 실패하면 사진 읽기를 멈추고 그 결과는 버린다.
// 쓰기(격리 · 거절 · 저장)는 둘 다 끝난 뒤 하나의 길에서만 한다.

import type { CompanionLlm } from "./chat-send.contract.ts";
import type { MyStoryRequest } from "./companion-contract/index.ts";
import { callRpc, type RpcEnv } from "./companion-rpc.ts";
import { crisisResourcesFor } from "./companion-safety.ts";
import { storyCheckText } from "./companion-story-compose.ts";
import { checkStoryText } from "./companion-story-draft.ts";
import type { StoryRead, StoryReader } from "./companion-story-read.ts";
import {
  downloadStoryPhoto,
  quarantineStoryPhoto,
  type StoryFetch,
  type StoryPhoto,
} from "./companion-story-storage.ts";
import type { Outbound } from "./delete-account.contract.ts";

export const STORY_READ_TIMEOUT_MS = 8_000;
const STORAGE_TIMEOUT_MS = 10_000;

export type PhotoPostDeps = {
  readonly outbound: Outbound;
  readonly fetch: StoryFetch;
  readonly reader: StoryReader;
  readonly readTimeoutMs?: number;
};

type PostBody = Extract<MyStoryRequest, { action: "post" }> & { readonly image_path: string };
type Json = Record<string, unknown>;

/**
 * 사진을 읽는다. 제때 끝나지 않거나 실패하면 null(다시 보기). 읽기 구현이 신호를 듣지 않아도 제때 돌아오게 경주시킨다 —
 * 진 쪽의 약속도 `Promise.race`가 받아 두므로 나중의 거절이 처리되지 않은 채 남지 않는다.
 */
export async function readStoryPhoto(
  deps: Pick<PhotoPostDeps, "reader" | "readTimeoutMs">,
  input: {
    readonly photo: StoryPhoto;
    readonly line: string;
    readonly overlays: readonly string[];
    /** 바깥에서 멈춤(글이 막힘) — 시간 초과와 같이 null. */
    readonly stop?: AbortSignal;
  },
): Promise<StoryRead | null> {
  const timeoutMs = deps.readTimeoutMs ?? STORY_READ_TIMEOUT_MS;
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), timeoutMs);
  const { stop, ...read } = input;
  if (stop?.aborted === true) abort.abort();
  stop?.addEventListener("abort", () => abort.abort(), { once: true });
  try {
    return await Promise.race([
      deps.reader({ ...read, signal: abort.signal }),
      new Promise<null>((resolve) =>
        abort.signal.addEventListener("abort", () => resolve(null), { once: true }),
      ),
    ]);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** 약속을 던지지 않는 결과로 — 기다리기 전에 실패해도 처리되지 않은 거절로 남지 않는다. */
function settled<T>(
  promise: Promise<T>,
): Promise<
  { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: unknown }
> {
  return promise.then(
    (value) => ({ ok: true as const, value }),
    (error: unknown) => ({ ok: false as const, error }),
  );
}

/** `<내 id>/<파일 이름>` 꼴인가 — 서버 저장 판정(`companion_save_my_photo_story`)과 같은 규칙. */
export const ownPhotoPath = (userId: string, path: string): boolean =>
  path.startsWith(`${userId}/`) &&
  /^[A-Za-z0-9._-]{1,120}$/.test(path.slice(userId.length + 1)) &&
  !path.slice(userId.length + 1).startsWith(".");

export const overlayWords = (overlays: PostBody["overlays"]): string[] =>
  (overlays ?? []).map((overlay) => overlay.ko.trim()).filter((word) => word !== "");

export async function postPhotoStory(
  deps: PhotoPostDeps,
  env: RpcEnv,
  llm: CompanionLlm,
  userId: string,
  body: PostBody,
  now: string,
): Promise<Json> {
  // 경로는 서버 키로 읽고 옮기고 지운다 — 먼저 자기 폴더의 파일 이름인지 본다(남의 폴더 · 다른 버킷으로 빠지는 `..`를 막는다).
  if (!ownPhotoPath(userId, body.image_path)) return { result: "invalid" };
  const gate = await callRpc<Json | null>(deps.outbound, env, "companion_my_photo_gate", {
    p_user_id: userId,
    p_client_id: body.client_id,
    p_tz_offset_min: body.tz_offset_min ?? null,
    p_region: body.client_region ?? null,
    p_now: now,
  });
  if (gate?.["result"] === "exists") return { result: "ok", story: gate["story"] ?? null };
  if (gate?.["result"] !== "ok") return gate ?? { result: "off" };

  // 사진 스토리는 성인만 올린다(문이 봤다) — 글 검수도 성인 기준이다.
  const crisis = () => ({
    result: "crisis",
    resources: crisisResourcesFor(body.client_region ?? null).resources,
  });
  // 사진 쪽(내려받기 → 읽기)을 먼저 띄우고 글 검수를 기다린다. 사진 쪽의 실패는 글 판정 뒤에야 드러낸다(차례로 돌 때와 같은 결과).
  const stop = new AbortController();
  const photoSide = settled(
    (async () => {
      const photo = await downloadStoryPhoto(deps.fetch, env, body.image_path, STORAGE_TIMEOUT_MS);
      if (photo === null || stop.signal.aborted) return { photo, read: null };
      const read = await readStoryPhoto(deps, {
        photo,
        line: body.ko,
        overlays: overlayWords(body.overlays),
        stop: stop.signal,
      });
      return { photo, read };
    })(),
  );
  const checkText = storyCheckText(body.ko, body.overlays ?? []);
  if (checkText !== "") {
    let text: Awaited<ReturnType<typeof checkStoryText>>;
    try {
      text = await checkStoryText(llm, checkText, "adult", AbortSignal.timeout(STORAGE_TIMEOUT_MS));
    } catch (error) {
      stop.abort();
      throw error;
    }
    if (text === "block" || text === "crisis") stop.abort();
    if (text === "block") return { result: "text_blocked" };
    if (text === "crisis") return crisis();
  }

  const side = await photoSide;
  if (!side.ok) throw side.error;
  const { photo, read } = side.value;
  if (photo === null) return { result: "no_photo" };
  if (read?.verdict === "reject") {
    const path = await quarantineStoryPhoto(
      deps.fetch,
      env,
      body.image_path,
      photo,
      STORAGE_TIMEOUT_MS,
    );
    const rejection = await callRpc<Json | null>(deps.outbound, env, "companion_reject_my_photo", {
      p_user_id: userId,
      p_client_id: body.client_id,
      p_category: read.category,
      p_quarantine_path: path,
      p_now: now,
      // 격리하지 못했으면 서버가 원본을 정리 대기열에 넣는다 — 거절한 사진을 올린 사람의 버킷에 남기지 않는다.
      p_source_path: body.image_path,
    });
    return { result: "rejected", rejection };
  }
  if (read?.scene.crisis === true) return crisis();
  const scene = read !== null ? read.scene : null;
  const saved = await callRpc<Json | null>(deps.outbound, env, "companion_save_my_photo_story", {
    p_user_id: userId,
    p_client_id: body.client_id,
    p_image_path: body.image_path,
    p_ko: body.ko,
    p_roman: body.roman ?? "",
    p_meaning: body.meaning ?? "",
    p_lang: body.lang,
    p_original: body.original ?? null,
    p_overlays: body.overlays ?? [],
    p_scene: scene,
    p_status: read === null ? "checking" : "live",
    p_tz_offset_min: body.tz_offset_min ?? null,
    p_region: body.client_region ?? null,
    p_now: now,
  });
  return saved ?? { result: "invalid" };
}
