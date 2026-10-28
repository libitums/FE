import "background-only";

import {
  deliveryEpisodeSchema,
  type DeliveryCompletion,
  type DeliveryEpisodeV2,
} from "./episode-content.schema";
import type {
  DecodeIssue,
  DecodeResult,
  Episode,
  EpisodeCompletion,
  EpisodeStory,
} from "./episode-content.model";
import { interludePlanOf } from "./episode-content.interlude";
import {
  findUnknownItemTypes,
  formatPath,
  isRecord,
  issue,
  maybe,
  nonEmpty,
  toCut,
  toDialogueLine,
  toWord,
} from "./episode-content.normalize";
import { byKey, resolvePairs, resolveTurnOrder, toItem } from "./episode-content.items";
import { counterpartAvatarPathOf } from "../content-url/content-avatar";

export type * from "./episode-content.model";

// 와이어(delivery-2 JSON)를 도메인 `Episode`로 바꾸는 디코더입니다. 단계는 모양 검사 →
// 의미 검사 → 정규화이고, 도메인 타입은 `episode-content.model.ts`에 있습니다.
// 실패는 에피소드 단위입니다(반쪽 에피소드는 없습니다). 미해결 `ref`만 경고입니다.
// 예외를 던지지 않습니다 — 어떤 입력에도 `DecodeResult`를 돌려줍니다.

/** 구조를 통과한 뒤의 의미 검사 — 전부 모아서 돌려줍니다. `rpIndex`는 최종 테스트 스텝 자리(-1이면 없음). */
function checkSemantics(wire: DeliveryEpisodeV2): { errors: DecodeIssue[]; rpIndex: number } {
  const errors: DecodeIssue[] = [];

  const seen = new Set<string>();
  wire.steps.forEach((step, i) => {
    step.items.forEach((item, j) => {
      if (seen.has(item.id)) {
        errors.push(
          issue("duplicate-item-id", `steps[${i}].items[${j}].id`, `duplicate item id: ${item.id}`),
        );
      }
      seen.add(item.id);
    });
  });

  const rpIndexes = wire.steps.flatMap((step, i) => (step.id === "RP" ? [i] : []));
  const rpIndex = rpIndexes.length === 1 ? (rpIndexes[0] ?? -1) : -1;
  if (rpIndex === -1) {
    errors.push(
      issue(
        "final-test-missing",
        "steps",
        `exactly one final-test step with id "RP" is required (found ${rpIndexes.length})`,
      ),
    );
  } else {
    const rpOrder = wire.steps[rpIndex]?.order ?? 0;
    if (wire.steps.some((step, i) => i !== rpIndex && step.order >= rpOrder)) {
      errors.push(
        issue(
          "final-test-position",
          `steps[${rpIndex}].order`,
          "final-test step order must be the last",
        ),
      );
    }
  }

  wire.steps.forEach((step, i) => {
    step.items.forEach((item, j) => {
      const path = `steps[${i}].items[${j}].answers`;
      if (
        item.type === "TURN_ORDER" &&
        resolveTurnOrder(item.tiles, item.answers[0]?.ko) === undefined
      ) {
        errors.push(
          issue(
            "string-answer-malformed",
            path,
            "TURN_ORDER answer cannot be resolved to tile indexes",
          ),
        );
      }
      if (
        item.type === "PAIR_MATCH" &&
        resolvePairs(item.tiles, item.answers[0]?.ko) === undefined
      ) {
        errors.push(
          issue("string-answer-malformed", path, "PAIR_MATCH answer cannot be resolved to pairs"),
        );
      }
    });
  });

  errors.push(
    ...checkCompletion(
      wire.completion,
      wire.steps.map((step) => step.id),
    ),
  );

  return { errors, rpIndex };
}

/** 비면 `completion.requires` 하나, 모르는 id마다 `completion.requires[i]` 하나 — 코드 `completion-malformed`. */
function checkCompletion(
  completion: DeliveryCompletion | undefined,
  stepIds: readonly string[],
): DecodeIssue[] {
  if (completion === undefined) {
    return [];
  }
  if (completion.requires.length === 0) {
    return [
      issue("completion-malformed", "completion.requires", "completion.requires must not be empty"),
    ];
  }
  const issues: DecodeIssue[] = [];
  completion.requires.forEach((id, i) => {
    if (!stepIds.includes(id)) {
      issues.push(
        issue(
          "completion-malformed",
          `completion.requires[${i}]`,
          `completion.requires has unknown step id ${id}`,
        ),
      );
    }
  });
  return issues;
}

/** 중복 제거(앞의 것 유지) — 없으면 undefined. */
function completionOf(completion: DeliveryCompletion | undefined): EpisodeCompletion | undefined {
  if (completion === undefined) {
    return undefined;
  }
  return {
    requires: completion.requires.filter((id, i) => completion.requires.indexOf(id) === i),
  };
}

function collectWarnings(wire: DeliveryEpisodeV2): DecodeIssue[] {
  const known = new Set([...wire.words.map((w) => w.id), ...wire.patterns.map((p) => p.id)]);
  const warnings: DecodeIssue[] = [];
  if (counterpartAvatarPathOf(wire.counterpart_avatar).kind === "invalid") {
    warnings.push(
      issue(
        "invalid-asset-path",
        "counterpart_avatar",
        "counterpart_avatar must be a bucket-relative image path",
      ),
    );
  }
  wire.steps.forEach((step, i) => {
    step.items.forEach((item, j) => {
      // 와이어의 `ref`만 읽습니다 — 문항 전체를 변환(toItem)할 이유가 없습니다. 빈 문자열은 디코더 규칙대로
      // 「없음」입니다.
      const ref = nonEmpty(item.ref);
      if (ref !== undefined && !known.has(ref)) {
        warnings.push(
          issue(
            "unresolved-ref",
            `steps[${i}].items[${j}].ref`,
            `ref not found in words or patterns: ${ref}`,
          ),
        );
      }
    });
  });
  return warnings;
}

function toEpisode(
  wire: DeliveryEpisodeV2,
  rpIndex: number,
  stories: ReadonlyMap<string, EpisodeStory>,
): Episode {
  const rp = wire.steps[rpIndex];
  const learning = wire.steps.filter((_, i) => i !== rpIndex).sort(byKey((step) => step.order));
  const avatar = counterpartAvatarPathOf(wire.counterpart_avatar);
  return {
    id: wire.unit_id,
    schema: wire.schema,
    title: wire.title,
    ...maybe("titleEn", wire.title_en?.trim() || undefined),
    day: wire.day,
    timeOfDay: wire.time_of_day,
    place: wire.place,
    counterpart: wire.counterpart,
    ...maybe("counterpartAvatar", avatar.kind === "path" ? avatar.path : undefined),
    prologue: [...wire.pre_cuts].sort(byKey((cut) => cut.index)).map(toCut),
    dialogue: [...wire.dialogue].sort(byKey((line) => line.seq)).map(toDialogueLine),
    units: learning.map((step) => ({
      id: step.id,
      order: step.order,
      items: step.items.map(toItem),
      ...maybe("story", stories.get(step.id)),
    })),
    finalTest: {
      id: rp?.id ?? "RP",
      order: rp?.order ?? 0,
      items: (rp?.items ?? []).map(toItem),
    },
    ...maybe("completion", completionOf(wire.completion)),
    epilogue: [...wire.post_cuts].sort(byKey((cut) => cut.index)).map(toCut),
    words: wire.words.map(toWord),
    patterns: wire.patterns.map((p) => ({
      id: p.id,
      ko: p.ko,
      roman: p.roman,
      glossEn: p.gloss_en,
    })),
  };
}

function decode(input: unknown): DecodeResult {
  if (!isRecord(input) || input["schema"] !== "delivery-2") {
    return {
      ok: false,
      errors: [issue("schema-mismatch", "schema", 'schema is not "delivery-2"')],
    };
  }

  const unknownTypes = findUnknownItemTypes(input);
  if (unknownTypes.length > 0) {
    return { ok: false, errors: unknownTypes };
  }

  const parsed = deliveryEpisodeSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      errors: parsed.error.issues.map((found) =>
        issue(
          found.message === "option-correct-count" ? "option-correct-count" : "invalid-shape",
          formatPath(found.path),
          found.message,
        ),
      ),
    };
  }

  // 막간 스텝은 의미 검사 앞에서 읽습니다 — 버린 스텝의 id가 `completion.requires`에 남아 실패하지 않게.
  const interludes = interludePlanOf(parsed.data);
  const { errors, rpIndex } = checkSemantics(interludes.wire);
  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    episode: toEpisode(interludes.wire, rpIndex, interludes.stories),
    warnings: [...interludes.warnings, ...collectWarnings(interludes.wire)],
  };
}

/**
 * delivery-2 에피소드 JSON(`JSON.parse` 결과)을 도메인 `Episode`로 바꿉니다.
 * 순수 함수 — 입력을 변형하지 않고(깊은 복사 결과) 예외를 던지지 않습니다.
 * 단계: 스키마 판별 → 문항 type 선검사 → 모양 검사 → 의미 검사 → 정규화 → 경고.
 */
export function decodeEpisode(input: unknown): DecodeResult {
  try {
    return decode(input);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      errors: [issue("invalid-shape", "", `unexpected error while decoding: ${message}`)],
    };
  }
}
