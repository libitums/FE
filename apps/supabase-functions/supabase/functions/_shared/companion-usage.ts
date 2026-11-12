// LLM 사용량 모으기. 턴(또는 턴 뒤 작업) 하나 동안의 호출을 단계별로 더해 저장 meta · 로그에 싣는다.
// 비용을 재는 근거다 — 캐시가 맞는지(cacheReadTokens)도 여기서 보인다.

import type { LlmStep, LlmUsage } from "./chat-send.contract.ts";

/** 단계 하나의 합계. 같은 단계를 여러 번 부르면(재시도 · 검사 두 번) 더한다. */
export type StepUsage = {
  model: string;
  calls: number;
  inputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  outputTokens: number;
};

export type UsageSummary = Partial<Record<LlmStep, StepUsage>>;

export type UsageCollector = {
  readonly record: (usage: LlmUsage) => void;
  /** 지금까지의 합계. 부른 단계가 없으면 빈 객체. */
  readonly summary: () => UsageSummary;
};

export function createUsageCollector(): UsageCollector {
  const steps: UsageSummary = {};
  return {
    record(usage) {
      const step = steps[usage.step];
      if (step === undefined) {
        steps[usage.step] = {
          model: usage.model,
          calls: 1,
          inputTokens: usage.inputTokens,
          cacheReadTokens: usage.cacheReadTokens,
          cacheWriteTokens: usage.cacheWriteTokens,
          outputTokens: usage.outputTokens,
        };
        return;
      }
      step.calls += 1;
      step.inputTokens += usage.inputTokens;
      step.cacheReadTokens += usage.cacheReadTokens;
      step.cacheWriteTokens += usage.cacheWriteTokens;
      step.outputTokens += usage.outputTokens;
    },
    summary: () => structuredClone(steps),
  };
}

/** 로그 한 줄용: `reply=1200/3400/0/180 feedback=…`(입력/캐시 읽기/캐시 쓰기/출력). 부른 단계가 없으면 빈 글. */
export function usageLine(summary: UsageSummary): string {
  return Object.entries(summary)
    .map(
      ([step, usage]) =>
        `${step}=${usage.inputTokens}/${usage.cacheReadTokens}/${usage.cacheWriteTokens}/${usage.outputTokens}`,
    )
    .join(" ");
}

/** 저장할 캐릭터 메시지의 meta에 지금까지의 사용량(`usage`)을 붙인다. */
export function withUsageMeta(
  assistant: Record<string, unknown>,
  usage: UsageCollector,
): Record<string, unknown> {
  return {
    ...assistant,
    meta: { ...(assistant.meta as Record<string, unknown> | undefined), usage: usage.summary() },
  };
}
