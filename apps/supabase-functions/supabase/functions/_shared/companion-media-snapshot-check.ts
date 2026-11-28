// 스냅샷 검사 노드 요청(`companion-media-run.ts`의 3단계) — v1은 v1 글(ADR-0146), v2m은 학습자 배치까지 보는 글(ADR-0179 D5)에
// 고정 대상 그림을 붙였으면 대상 판정(기록만, D8)까지. 판정 계산은 `companion-snapshot-prompts.ts` · `companion-snapshot-v2-prompts.ts`.

import { type Image, imageBlock, type ToolCall } from "./companion-media-engines.ts";
import { CHECK_TOOL, checkSystem, type SnapshotPrompt } from "./companion-snapshot-prompts.ts";
import {
  CHECK_TOOL as V2_CHECK_TOOL,
  checkSystem as v2CheckSystem,
  type RoutedSubject,
  type StoredPlan,
} from "./companion-snapshot-v2.ts";
import type { SnapshotJob, V2Ready } from "./companion-media-snapshot-plan.ts";

/**
 * 검사 노드 요청 — v1은 v1 글, v2m은 학습자 배치까지 보는 글(ADR-0179 D5). 기준 이미지 첫 장과 결과를 나란히.
 * v2m에 고정 대상 그림을 붙였으면 결과 뒤에 그 그림들을 넣고 `subject_matches`를 적게 한다(기록만, D8).
 */
export function checkRequest(
  job: SnapshotJob,
  v2: V2Ready | null,
  refs: readonly Image[],
  png: Uint8Array,
  prompt: SnapshotPrompt | StoredPlan,
  subjects: readonly RoutedSubject[] = [],
): ToolCall {
  const images = [imageBlock(refs[0]!), imageBlock({ bytes: png, mime: "image/png" })];
  if (v2 === null)
    return {
      system: checkSystem(job.ageBand),
      tool: CHECK_TOOL,
      content: [
        ...images,
        { type: "text" as const, text: "Image 1: reference. Image 2: snapshot. Give the verdict." },
      ],
      maxTokens: 600,
    };
  const learner = (prompt as StoredPlan).learner;
  const extra = subjects.slice(0, refs.length - 1);
  const named = extra
    .map((s, i) => ` Image ${i + 3}: fixed subject reference (${s.kind}, ${s.id}).`)
    .join("");
  return {
    system: v2CheckSystem(job.ageBand, v2.manifest.figureKeep, extra.length > 0),
    tool: V2_CHECK_TOOL,
    content: [
      ...images,
      ...refs.slice(1, extra.length + 1).map((ref) => imageBlock(ref)),
      {
        type: "text" as const,
        text: `Image 1: face reference. Image 2: snapshot.${named} Planned learner: ${learner}. Give the verdict.`,
      },
    ],
    maxTokens: 600,
  };
}
