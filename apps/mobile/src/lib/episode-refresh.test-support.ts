import type { ContentStore } from "./episode-cache";
import { minimalRoleplayTurnWire } from "./episode-content.test-support";
import type { FetchText, FetchTextResult } from "./episode-remote";
import { sha256Hex, utf8Bytes } from "./sha256";

// `refreshEpisodeCatalog` 테스트들이 함께 쓰는 대역입니다 — 최소 에피소드 와이어 · 원격 매니페스트 · 가짜 전송 ·
// 가짜 저장소. 제품 코드가 import하지 않습니다.

export type Wire = Record<string, unknown>;

export const t3 = (ko: string): Wire => ({ ko, roman: `r-${ko}`, en: `e-${ko}` });

export const options = (count: number): Wire[] =>
  Array.from({ length: count }, (_, i) => {
    const option: Wire = {
      id: `o${i + 1}`,
      ko: `보기${i + 1}`,
      roman: `bogi${i + 1}`,
      correct: i === 0,
    };
    return i === 0 ? option : { ...option, why_wrong: "이 자리에 맞는 말이 아니다" };
  });

/** decodeEpisode를 통과하는 최소 에피소드(와이어). */
export function minimalEpisode(unitId: string): Wire {
  const cut = (kind: string): Wire => ({
    index: 1,
    kind,
    cut_kind: "narration",
    narration: t3("지문"),
    image_brief: "brief",
    image_url: "",
  });
  const line = (seq: number): Wire => ({
    seq,
    role: seq % 2 === 1 ? "counterpart" : "player",
    text: t3(`대사${seq}`),
    audio_url: "",
  });
  const roleLine: Wire = {
    id: "S1-01",
    type: "ROLE_LINE",
    mode: "choice",
    event: "R",
    prompt: { ko: "질문", en: "question" },
    context: t3("상대 대사"),
    options: options(3),
    feedback: { correct: { ko: "맞아요" }, wrong_option: "o2" },
  };
  return {
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
  };
}

export type Remote = { entry: Wire; text: string };

export function remote(id: string, order: number, extra: Wire = {}, text?: string): Remote {
  const body = text ?? JSON.stringify(minimalEpisode(id));
  return {
    text: body,
    entry: {
      id,
      order,
      title: `제목 ${id}`,
      schema: "delivery-2",
      version: "2026-10-13.1",
      sha256: sha256Hex(utf8Bytes(body)),
      bytes: utf8Bytes(body).length,
      url: `episodes/${id}.json`,
      ...extra,
    },
  };
}

export const manifestText = (remotes: Remote[], extra: Wire = {}): string =>
  JSON.stringify({
    schema: "manifest-1",
    generated_at: "2026-10-13T00:00:00Z",
    episodes: remotes.map((r) => r.entry),
    ...extra,
  });

export type Reply = FetchTextResult | "reject";
export const ok = (text: string): Reply => ({ ok: true, status: 200, text });

export function fakeFetch(replies: Record<string, Reply>) {
  const calls: string[] = [];
  const fetchText: FetchText = async (relative) => {
    calls.push(relative);
    const reply = replies[relative] ?? { ok: true, status: 404, text: "" };
    if (reply === "reject") {
      throw new Error("boom");
    }
    return reply;
  };
  return { fetchText, calls };
}

export function fakeStore(
  initial: Record<string, string> = {},
  opts: { available?: boolean; throwOnSet?: boolean; throwOnSetKeyPrefix?: string } = {},
) {
  const data = new Map(Object.entries(initial));
  const sets: string[] = [];
  const removes: string[] = [];
  const store: ContentStore = {
    available: () => opts.available ?? true,
    get: (key) => data.get(key) ?? null,
    set: (key, value) => {
      if (
        opts.throwOnSet === true ||
        (opts.throwOnSetKeyPrefix !== undefined && key.startsWith(opts.throwOnSetKeyPrefix))
      ) {
        throw new Error("quota");
      }
      sets.push(key);
      data.set(key, value);
    },
    remove: (key) => {
      removes.push(key);
      data.delete(key);
    },
  };
  return { store, data, sets, removes };
}
