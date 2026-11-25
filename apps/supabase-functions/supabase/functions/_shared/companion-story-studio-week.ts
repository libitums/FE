// 친구 스토리 주간 기획의 「한 주 기획」(`plan_week`, ADR-0192 D4 · D9) — 중앙에서 소재를 인물에 나눈 뒤 인물마다 초안을 쓴다.
// 1. 달력에서 인물 목록 → 인물마다 기획 맥락(빈 자리 · 인물 카드 · 최근 한 줄 · 최근 컷 · 그 주의 메모)을 동시에 읽는다.
// 2. 배정(`llm.assign`) — 메모의 소재를 자리(인물 · 날짜)마다 하나씩. 구체적인 소재는 한 인물에게만 간다.
// 3. 컷 배정(코드 — 셀카 · 남이 찍어 준 컷 · 인물 없음의 비율을 모든 인물을 합쳐 맞춘다) + 인물마다 초안 쓰기(동시에 — 소재가 이미 나뉘어 서로 기다릴 것이 없다).
// 4. 한 번에 넣는다(`companion_add_story_drafts`). 인물 하나의 맥락 읽기 · 쓰기 실패는 그 인물만 빠진다(`failed`). 배정이 자리와 하나도
//    맞지 않으면 쓰지 않는다(`failed`), 일부만 맞으면 `unassigned`에 수를 싣는다.
// 인물 하나만 다시 쓰는 길은 `write`(배정 없이 다른 인물의 초안을 보고 겹치지 않게 쓴다).

import {
  type Body,
  catalogFrom,
  count,
  day,
  LEARNING_CHARACTERS,
  notesOf,
  type PlanContext,
  type Rpc,
  slotPlans,
  type StudioActionDeps,
  writeItems,
} from "./companion-story-studio-actions.ts";
import type { DraftItem } from "./companion-story-studio-items.ts";
import type { Assignment } from "./companion-story-studio-llm.ts";
import { allocateWeek, shotMixFrom } from "./companion-story-studio-shots.ts";
import { mapLimited } from "./map-limited.ts";

/** 배정 한 번 + 인물별 쓰기(동시)가 함수 한 번(150초) 안에 끝나게. */
export const ASSIGN_TIMEOUT_MS = 45_000;
export const WEEK_WRITE_TIMEOUT_MS = 75_000;
/** 인물 수(아홉)보다 크게 — 쓰기가 두 물결로 나뉘면 시간 예산(45 + 75초)이 깨진다. */
const WEEK_WRITE_CONCURRENCY = 12;
/** 한 주 기획은 한 주씩 — 주간 메모가 주마다 하나라, 두 주를 한 번에 쓰면 둘째 주가 첫 주의 메모로 쓰인다. */
const WEEK_DAYS_MAX = 7;

type Calendar = { characters?: { id?: unknown }[] } | null;
type Ready = NonNullable<PlanContext> & {
  character: NonNullable<NonNullable<PlanContext>["character"]>;
};

export async function planWeek(
  deps: StudioActionDeps & { readonly assignTimeoutMs?: number },
  rpc: Rpc,
  body: Body,
  by: string,
  now: string,
): Promise<Record<string, unknown>> {
  const from = day(body["from"]);
  if (from === null) return { result: "invalid" };
  if (deps.llm === null) return { result: "not_configured" };
  const days = Math.min(count(body["days"], 7), WEEK_DAYS_MAX);
  const calendar = await rpc<Calendar>("companion_story_calendar", { p_from: from, p_days: days });
  const ids = (calendar?.characters ?? [])
    .map((character) => character.id)
    .filter((id): id is string => typeof id === "string");
  // 한 인물의 맥락 읽기가 실패해도 한 주 전체를 버리지 않는다 — 그 인물만 `failed`.
  const failed: string[] = [];
  const read = await Promise.allSettled(
    ids.map((id) =>
      rpc<PlanContext>("companion_story_plan_context", {
        p_character_id: id,
        p_from: from,
        p_days: days,
      }),
    ),
  );
  read.forEach((result, index) => {
    if (result.status === "rejected") failed.push(ids[index]!);
  });
  const contexts = read
    .map((result) => (result.status === "fulfilled" ? result.value : null))
    .filter(
      (context): context is Ready =>
        context !== null && context.character !== null && context.slots.length > 0,
    );
  if (contexts.length === 0)
    return failed.length > 0
      ? { result: "failed", failed }
      : { result: "no_slots", drafts: [], skipped: 0, failed: [] };
  const slots = contexts.reduce((sum, context) => sum + context.slots.length, 0);
  // 그 무렵 이미 있는 초안(다시 돌릴 때) — 인물마다 본 「다른 인물의 초안」을 합치면 전부다.
  const taken = [
    ...new Map(
      contexts
        .flatMap((context) => context.others ?? [])
        .map((story) => [`${story.characterId} ${story.day}`, story]),
    ).values(),
  ];

  let assigned: readonly Assignment[];
  try {
    assigned = await deps.llm.assign({
      notes: notesOf(contexts[0]!),
      taken,
      characters: contexts.map((context) => ({
        id: context.character.id,
        name: context.character.name,
        persona: context.character.persona,
        learning: LEARNING_CHARACTERS.includes(context.character.id),
        days: context.slots,
      })),
      signal: AbortSignal.timeout(deps.assignTimeoutMs ?? ASSIGN_TIMEOUT_MS),
    });
  } catch {
    return { result: "failed" };
  }

  // 컷은 모든 인물을 합쳐 비율대로 — 인물마다 따로 맞추면 남이 찍어 준 컷이 모자란다.
  const shots = allocateWeek(
    contexts.map((context) => ({
      id: context.character.id,
      days: context.slots,
      recent: context.shots ?? [],
      hasRef: context.character.hasRef,
    })),
    shotMixFrom(contexts[0]!.shotMix),
  );
  // 배정이 자리와 맞지 않으면(다른 인물 · 날짜 모양이 다름 · 빈 목록) 인물들이 같은 메모에서 동시에 고르게 된다 — 겹침을 막으려던 것이
  // 무너지므로, 하나도 맞지 않으면 실패로 닫고 일부만 맞으면 수를 알린다.
  const known = new Set(
    contexts.flatMap((context) => context.slots.map((slot) => `${context.character.id} ${slot}`)),
  );
  const matched = new Set(
    assigned.map((item) => `${item.characterId} ${item.day}`).filter((key) => known.has(key)),
  ).size;
  if (matched === 0) return { result: "failed", failed };
  const catalog = catalogFrom(body["catalog"]);
  const written = await mapLimited(contexts, WEEK_WRITE_CONCURRENCY, async (context) => {
    const id = context.character.id;
    const mine = assigned.filter((item) => item.characterId === id);
    const items = await writeItems(
      deps,
      context,
      slotPlans(context, mine, shots[id]),
      // 카탈로그는 모두에게 준다 — 초안 쓰기에 보이는 것은 덕수쌤뿐이고, 나머지는 다 쓴 한 줄에 단어가 있을 때 붙이는 데만 쓴다(D6).
      catalog,
      deps.writeTimeoutMs ?? WEEK_WRITE_TIMEOUT_MS,
    );
    if (items === null || items.length === 0) failed.push(id);
    return items ?? [];
  });
  const items: DraftItem[] = written.flat();
  if (items.length === 0) return { result: "failed", failed };
  const added = await rpc<{ drafts?: unknown[]; skipped?: number } | null>(
    "companion_add_story_drafts",
    { p_drafts: items, p_by: by, p_now: now },
  );
  const drafts = added?.drafts ?? [];
  return {
    result: "ok",
    drafts,
    // 쓰지 못한 자리 — 실패한 인물의 자리 · 모델이 빠뜨린 날 · 넣기에서 걸러진 것을 모두 센다(넣은 수로 계산한다).
    skipped: Math.max(0, slots - drafts.length),
    unassigned: slots - matched,
    failed,
  };
}
