// 친구 스토리 주간 기획 함수(`companion-story-studio-handler.ts`)의 두 동작 — 초안 쓰기(`write`)와 검토(`review`). ADR-0192 D4 · D6 · D8.
// - 쓰기: 기획 맥락(인물 카드 · 빈 자리 · 최근 한 줄 · 주간 메모) → 모델 → 정리(`draftItems`) → `companion_add_story_drafts`.
// - 검토: 단계 하나를 `companion_review_story_draft`로. 최종 승인(`approve`)만 빠진 화면 언어의 뜻을 먼저 번역해 채운다.

import { type DraftItem, draftItems } from "./companion-story-studio-items.ts";
import { STORY_OTHER_LANGS, type StudioLlm } from "./companion-story-studio-llm.ts";
import type { CatalogWord, OtherStory, SlotPlan } from "./companion-story-studio-prompts.ts";
import { allocateShots, shotMixFrom, type StoryShot } from "./companion-story-studio-shots.ts";
import { romanize } from "./korean-romanize.ts";

/** 학습 스토리를 쓰는 인물(ADR-0192 D3 — 덕수쌤). */
export const LEARNING_CHARACTERS: readonly string[] = ["duksu"];
export const WRITE_TIMEOUT_MS = 110_000;
export const WRITE_DAYS_MAX = 14;
/** 번역 한 언어의 글자 상한 — 여섯 언어가 `story_drafts.meaning`(8,000바이트) 안에 들어가게. */
const MEANING_MAX = 300;
export const MEANINGS_TIMEOUT_MS = 25_000;
const REVIEW_ACTIONS = [
  "approve_plan",
  "edit",
  "redo_image",
  "set_image",
  "approve",
  "unapprove",
  "discard",
];

export type Body = Record<string, unknown>;
export type Rpc = <T>(fn: string, args: Record<string, unknown>) => Promise<T>;
export type StudioActionDeps = {
  readonly llm: StudioLlm | null;
  readonly writeTimeoutMs?: number;
  readonly meaningsTimeoutMs?: number;
};
type DraftJson = {
  status?: string;
  line?: { ko?: string; meaning?: Record<string, unknown> };
} | null;

export const str = (value: unknown, max = 200): string | null =>
  typeof value === "string" && value.trim() !== "" ? value.trim().slice(0, max) : null;
export const day = (value: unknown): string | null =>
  typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
export const count = (value: unknown, fallback: number) =>
  typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 35
    ? value
    : fallback;

export function catalogFrom(value: unknown): CatalogWord[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (word): word is CatalogWord =>
        typeof word === "object" &&
        word !== null &&
        typeof (word as CatalogWord).ko === "string" &&
        typeof (word as CatalogWord).episodeId === "string" &&
        typeof (word as CatalogWord).ref === "string",
    )
    .map((word) => ({
      ko: word.ko,
      episodeId: word.episodeId,
      ref: word.ref,
      ...(typeof word.meaning === "string" ? { meaning: word.meaning.slice(0, 80) } : {}),
    }))
    .slice(0, 3000);
}

export type PlanContext = {
  character: {
    id: string;
    name: string;
    persona: unknown;
    look: string;
    hasRef: boolean;
  } | null;
  slots: string[];
  recent: string[];
  others?: OtherStory[];
  /** 이 인물의 최근 컷들과 설정의 컷 비율 — 새 자리의 컷을 배정한다. */
  shots?: unknown[];
  shotMix?: unknown;
  plan: { notes?: string; research?: string } | null;
} | null;
type ReadyContext = NonNullable<PlanContext> & {
  character: NonNullable<NonNullable<PlanContext>["character"]>;
};

export const notesOf = (context: NonNullable<PlanContext>) =>
  [context.plan?.notes ?? "", context.plan?.research ?? ""]
    .filter((part) => part.trim() !== "")
    .join("\n\n");

/**
 * 자리마다 컷을 배정하고(비율), 중앙 배정이 준 소재를 얹는다. `shots`를 주면 그것을 쓴다(한 주 기획 — 모든 인물을 합쳐 배정),
 * 없으면 이 인물의 최근 컷에 이어 배정한다.
 */
export function slotPlans(
  context: ReadyContext,
  assigned: readonly { day: string; topic: string; brief: string }[] = [],
  given?: Readonly<Record<string, StoryShot>>,
): SlotPlan[] {
  const shots =
    given ??
    allocateShots(
      context.slots,
      context.shots ?? [],
      shotMixFrom(context.shotMix),
      context.character.hasRef,
    );
  return [...context.slots].sort().map((slotDay) => {
    const topic = assigned.find((item) => item.day === slotDay);
    return {
      day: slotDay,
      shot: shots[slotDay] ?? "scene",
      ...(topic === undefined ? {} : { topic: topic.topic, brief: topic.brief }),
    };
  });
}

/** 한 인물의 초안 쓰기 — 모델 호출 + 정리. 넣기(RPC)는 부르는 쪽이 한다. 실패면 null. */
export async function writeItems(
  deps: StudioActionDeps,
  context: ReadyContext,
  slots: readonly SlotPlan[],
  catalog: readonly CatalogWord[],
  timeoutMs: number,
): Promise<DraftItem[] | null> {
  if (deps.llm === null) return null;
  const characterId = context.character.id;
  try {
    const written = await deps.llm.write({
      character: context.character,
      learning: LEARNING_CHARACTERS.includes(characterId),
      slots,
      recent: context.recent,
      others: Array.isArray(context.others) ? context.others : [],
      notes: notesOf(context),
      catalog,
      signal: AbortSignal.timeout(timeoutMs),
    });
    return draftItems(written, { characterId, slots, catalog });
  } catch {
    return null;
  }
}

export async function write(
  deps: StudioActionDeps,
  rpc: Rpc,
  body: Body,
  by: string,
  now: string,
): Promise<Record<string, unknown>> {
  const characterId = str(body["characterId"], 80);
  const from = day(body["from"]);
  if (characterId === null || from === null) return { result: "invalid" };
  if (deps.llm === null) return { result: "not_configured" };
  const context = await rpc<PlanContext>("companion_story_plan_context", {
    p_character_id: characterId,
    p_from: from,
    // 한 번에 두 주까지 — 날짜가 많으면 모델 출력이 잘려 값만 치르고 실패한다.
    p_days: Math.min(count(body["days"], 7), WRITE_DAYS_MAX),
  });
  if (context === null || context.character === null) return { result: "not_found" };
  if (context.slots.length === 0) return { result: "no_slots", drafts: [], skipped: 0 };
  const ready = context as ReadyContext;
  const items = await writeItems(
    deps,
    ready,
    slotPlans(ready),
    catalogFrom(body["catalog"]),
    deps.writeTimeoutMs ?? WRITE_TIMEOUT_MS,
  );
  if (items === null || items.length === 0) return { result: "failed" };
  const added = await rpc<{ drafts?: unknown[]; skipped?: number } | null>(
    "companion_add_story_drafts",
    { p_drafts: items, p_by: by, p_now: now },
  );
  return {
    result: "ok",
    drafts: added?.drafts ?? [],
    skipped: (added?.skipped ?? 0) + (context.slots.length - items.length),
  };
}

export async function review(
  deps: StudioActionDeps,
  rpc: Rpc,
  body: Body,
  by: string,
  now: string,
): Promise<Record<string, unknown>> {
  const id = str(body["id"], 40);
  const action = str(body["step"], 40);
  if (id === null || !/^[0-9a-f-]{36}$/.test(id) || action === null) return { result: "invalid" };
  if (!REVIEW_ACTIONS.includes(action)) return { result: "invalid" };
  const patch =
    typeof body["patch"] === "object" && body["patch"] !== null ? (body["patch"] as Body) : {};
  const call = (act: string, change: Body) =>
    rpc<{ result: string; draft: DraftJson }>("companion_review_story_draft", {
      p_id: id,
      p_action: act,
      p_patch: change,
      p_by: by,
      p_now: now,
    });
  if (action === "edit" && typeof patch["ko"] === "string" && str(patch["roman"], 200) === null) {
    // 한 줄을 고치면 로마자도 다시 만든다. 숫자 · 로마자가 있으면 `reading`(읽는 대로 쓴 한글)을 같이 받을 수 있다.
    const reading = str(patch["reading"], 200) ?? patch["ko"];
    return {
      ...(await call("edit", { ...patch, roman: romanize(reading.replace(/\s+/gu, " ").trim()) })),
    };
  }
  if (action !== "approve") return { ...(await call(action, patch)) };

  // 최종 승인 — 빠진 화면 언어를 채운 뒤 승인한다. 영어 뜻은 사람이 본 것이다.
  const draft = await rpc<DraftJson>("companion_story_draft", { p_id: id });
  if (draft === null) return { result: "not_found", draft: null };
  const meaning = draft.line?.meaning ?? {};
  const [ko, en] = [draft.line?.ko ?? "", typeof meaning["en"] === "string" ? meaning["en"] : ""];
  const missing = STORY_OTHER_LANGS.filter(
    (lang) => typeof meaning[lang] !== "string" || meaning[lang] === "",
  );
  if (draft.status === "ready" && missing.length > 0) {
    if (deps.llm === null) return { result: "not_configured", draft };
    let translated: Record<string, string>;
    try {
      translated = await deps.llm.meanings({
        ko,
        en,
        signal: AbortSignal.timeout(deps.meaningsTimeoutMs ?? MEANINGS_TIMEOUT_MS),
      });
    } catch {
      return { result: "translate_failed", draft };
    }
    const full: Record<string, string> = { en };
    for (const lang of STORY_OTHER_LANGS) {
      const text =
        typeof meaning[lang] === "string" && meaning[lang] !== ""
          ? (meaning[lang] as string)
          : (translated[lang] ?? "").trim();
      if (text === "") return { result: "translate_failed", draft };
      full[lang] = [...text].slice(0, MEANING_MAX).join("");
    }
    const edited = await call("edit", { meaning: full });
    if (edited.result !== "ok") return { ...edited };
  }
  // 번역한 글을 같이 낸다 — 그 사이 글이 바뀌었으면(그림 다시 · 문구 맞추기) 승인하지 않는다.
  return { ...(await call("approve", { expect: ko })) };
}
