import { act, render } from "@lynx-js/react/testing-library";
import { vi } from "vitest";

import { App } from "../App";
import { signedInBootSession } from "./signed-in-app";
import { authSessionStorageKey, serializeAuthSession } from "../../lib/auth-session";
import { minimalRoleplayTurnWire } from "../../lib/episode-content.test-support";
import { entrySplashDurationMs } from "../../lib/entry-flow";
import { learningItemGuideSeenStorageKey } from "../../lib/learning-item-guide";
import { allLearningItemGuidesSeenValue } from "../../lib/learning-item-guide.test-support";
import { sha256Hex, utf8Bytes } from "../../lib/sha256";

// 에피소드 콘텐츠 받기 integration 테스트가 함께 쓰는 부팅 · 대역입니다. 대역은 경계뿐입니다 — 가짜 전송
// (`fetch`) · `NativeModules`(`StorageModule`, 선택 `ContentFileModule`) · Supabase 설정(`vi.stubEnv`).

export const supabaseUrl = "https://test.supabase.co";
export const contentBase = `${supabaseUrl}/storage/v1/object/public/content/`;

const t3 = (ko: string) => ({ ko, roman: `r-${ko}`, en: `e-${ko}` });

/** 디코드를 통과하는 최소 에피소드(와이어)입니다. `extra`는 맨 위에 더할 키입니다(자산 자리 등). */
export function minimalEpisodeText(unitId: string, extra: Record<string, unknown> = {}): string {
  const cut = (kind: string) => ({
    index: 1,
    kind,
    cut_kind: "narration",
    narration: t3("지문"),
    image_brief: "brief",
    image_url: "",
  });
  const line = (seq: number) => ({
    seq,
    role: seq % 2 === 1 ? "counterpart" : "player",
    text: t3(`대사${seq}`),
    audio_url: "",
  });
  const options = [1, 2, 3].map((n) => {
    const option = { id: `o${n}`, ko: `보기${n}`, roman: `bogi${n}`, correct: n === 1 };
    return n === 1 ? option : { ...option, why_wrong: "이 자리에 맞는 말이 아니다" };
  });
  const roleLine = {
    id: "S1-01",
    type: "ROLE_LINE",
    mode: "choice",
    event: "R",
    prompt: { ko: "질문", en: "question" },
    context: t3("상대 대사"),
    options,
    feedback: { correct: { ko: "맞아요" }, wrong_option: "o2" },
  };
  return JSON.stringify({
    schema: "delivery-2",
    unit_id: unitId,
    title: "최소 에피소드",
    day: 1,
    time_of_day: "낮",
    place: "최소 에피소드",
    counterpart: "미나",
    pre_cuts: [cut("pre")],
    dialogue: [line(1), line(2)],
    post_cuts: [cut("post")],
    steps: [
      { id: "S1", order: 1, items: [roleLine] },
      { id: "RP", order: 2, items: [minimalRoleplayTurnWire("RP-01")] },
    ],
    words: [{ id: "voca:1", ko: "물", roman: "mul", gloss_en: "water", role: "target" }],
    patterns: [{ id: "patt:1", ko: "{명사} 주세요", roman: "juseyo", gloss_en: "please give me" }],
    ...extra,
  });
}

export function manifestOf(
  episodes: readonly { id: string; order: number; text: string }[],
): string {
  return JSON.stringify({
    schema: "manifest-1",
    generated_at: "2026-10-13T00:00:00Z",
    episodes: episodes.map(({ id, order, text }) => ({
      id,
      order,
      title: `제목 ${id}`,
      schema: "delivery-2",
      version: "2026-10-13.1",
      sha256: sha256Hex(utf8Bytes(text)),
      bytes: utf8Bytes(text).length,
      url: `episodes/${id}.json`,
    })),
  });
}

const refreshedSessionBody = JSON.stringify({
  access_token: "refreshed-access-token",
  refresh_token: "refreshed-refresh-token",
  expires_in: 3600,
  token_type: "bearer",
  user: { id: "boot-user" },
});

export type BootOptions = {
  /** 콘텐츠 버킷 상대 경로 → 본문. 없는 경로는 404입니다. */
  readonly content: Readonly<Record<string, string>>;
  /** 있으면 `NativeModules.ContentFileModule`로 함께 세웁니다. */
  readonly contentFiles?: object;
};

export type Booted = { readonly urls: string[]; readonly store: Map<string, string> };

/** 로그인된 설치로 부팅합니다(`renderSignedInApp`과 같은 순서) — 콘텐츠 요청을 이 대역이 받습니다. */
export async function bootContentApp(options: BootOptions): Promise<Booted> {
  const store = new Map<string, string>();
  store.set(authSessionStorageKey, serializeAuthSession(signedInBootSession));
  store.set(learningItemGuideSeenStorageKey, allLearningItemGuidesSeenValue);
  vi.stubGlobal("NativeModules", {
    StorageModule: {
      get: (key: string) => store.get(key) ?? null,
      set: (key: string, value: string) => void store.set(key, value),
      remove: (key: string) => void store.delete(key),
    },
    ...(options.contentFiles === undefined ? {} : { ContentFileModule: options.contentFiles }),
  });
  vi.stubEnv("PUBLIC_SUPABASE_URL", supabaseUrl);
  vi.stubEnv("PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");

  const urls: string[] = [];
  vi.stubGlobal("fetch", (url: string) => {
    urls.push(url);
    if (url.includes("grant_type=refresh_token")) {
      return Promise.resolve({ status: 200, text: async () => refreshedSessionBody });
    }
    if (url.includes("/rest/v1/rpc/")) {
      return Promise.resolve({ status: 200, text: async () => "null" });
    }
    if (url.startsWith(contentBase)) {
      const body = options.content[url.slice(contentBase.length)];
      return Promise.resolve(
        body === undefined
          ? { status: 404, text: async () => "" }
          : { status: 200, text: async () => body },
      );
    }
    return Promise.reject(new Error(`예상 밖 요청 ${url}`));
  });

  vi.useFakeTimers();
  render(<App completedEpisodeIntroIds={["tutorial-intro"]} />);
  act(() => {
    vi.advanceTimersByTime(entrySplashDurationMs);
  });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
  vi.useRealTimers();
  return { urls, store };
}

export async function settle(): Promise<void> {
  for (let i = 0; i < 8; i += 1) {
    await act(async () => {
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    });
  }
}
