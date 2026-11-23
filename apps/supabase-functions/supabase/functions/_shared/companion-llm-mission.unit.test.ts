import type Anthropic from "@anthropic-ai/sdk";
import { expect, test } from "vitest";

import type { ChatSendEnv } from "./chat-send.contract.ts";
import { anthropicCompanionLlm } from "./companion-llm.ts";
import { anthropicMissionLlm } from "./companion-llm-mission.ts";
import {
  defaultMissionModels,
  missionFeedbackModelEnv,
  missionGraderModelEnv,
  missionHintModelEnv,
  missionJudgeModelEnv,
  missionModelsFrom,
  missionTurnModelEnv,
} from "./mission-env.ts";

// 미션의 모델(2026-11-19 사용자 결정, 2026-11-23 답도 Haiku): 채점은 Sonnet, 턴마다 부르는 것(답 · 판정 · 교정 · 힌트)은 Haiku가 기본이고, 미션 전용 환경 값으로만
// 바꾼다 — 컴패니언의 모델 설정(기본 Opus)을 물려받지 않는다. SDK 클라이언트를 바꿔 끼워 실제로 보내는 모델만 본다(네트워크 없음).

test("LM1. 기본값 — 채점 Sonnet, 답 · 판정 · 교정 · 힌트 Haiku", () => {
  expect(missionModelsFrom(() => undefined)).toEqual({
    turnModel: "claude-haiku-5-5",
    judgeModel: "claude-haiku-5-5",
    graderModel: "claude-sonnet-5-5",
    feedbackModel: "claude-haiku-5-5",
    hintModel: "claude-haiku-5-5",
  });
});

test("LM2. 미션 환경 값이 이긴다 · 빈 글은 없는 것 · 컴패니언 값은 물려받지 않는다", () => {
  const companion: Record<string, string> = {
    COMPANION_MODEL: "claude-opus-5-5",
    COMPANION_FEEDBACK_MODEL: "c-feedback",
    COMPANION_MODERATION_MODEL: "c-moderation",
    COMPANION_SUGGEST_MODEL: "c-suggest",
  };
  expect(missionModelsFrom((name) => companion[name])).toEqual(defaultMissionModels);
  const mission: Record<string, string> = {
    ...companion,
    [missionTurnModelEnv]: "m-turn",
    [missionGraderModelEnv]: "m-grader",
    [missionFeedbackModelEnv]: " ",
    [missionHintModelEnv]: "m-hint",
    [missionJudgeModelEnv]: "m-judge",
  };
  expect(missionModelsFrom((name) => mission[name])).toEqual({
    turnModel: "m-turn",
    judgeModel: "m-judge",
    graderModel: "m-grader",
    feedbackModel: "claude-haiku-5-5",
    hintModel: "m-hint",
  });
});

function fakeClient() {
  const sent: { kind: string; model: string; betas?: unknown; effort?: unknown }[] = [];
  const client = {
    beta: {
      messages: {
        stream(params: Record<string, any>) {
          sent.push({
            kind: "reply",
            model: params.model,
            betas: params.betas,
            effort: params.output_config?.effort,
          });
          return {
            async *[Symbol.asyncIterator]() {
              yield {
                type: "content_block_delta",
                delta: { type: "text_delta", text: "@speech 네\n" },
              };
            },
            finalMessage: async () => ({ stop_reason: "end_turn" }),
          };
        },
      },
    },
    messages: {
      async parse(params: Record<string, any>) {
        const system = String(params.system?.[0]?.text ?? "");
        sent.push({ kind: system.slice(0, 20), model: params.model, betas: params.betas });
        return {
          stop_reason: "end_turn",
          parsed_output: {
            category: "safe",
            action: "allow",
            status: "none",
            kind: null,
            items: [],
            lines: ["x"],
            goals: [],
            accuracy: 80,
            expressions: [],
            retry: [],
            summary: "",
            ko: "카드로 할게요.",
            roman: "kadeuro halgeyo.",
            meaning: "card",
          },
        };
      },
    },
  };
  return { client: client as unknown as Anthropic, sent };
}

const config: Extract<ChatSendEnv["llm"], { kind: "anthropic" }> = {
  kind: "anthropic",
  apiKey: "k",
  model: "claude-opus-5-5",
  moderationModel: "c-moderation",
  feedbackModel: "c-feedback",
  translationModel: "c-translation",
  suggestModel: "c-suggest",
};

test("LM3. 미션 턴의 답 · 교정은 미션 모델, 검사 · 번역은 컴패니언 모델, 채점 · 힌트는 미션 모델 — 컴패니언 답은 그대로", async () => {
  const { client, sent } = fakeClient();
  const llm = anthropicMissionLlm(
    anthropicCompanionLlm(config, () => {}, client),
    config,
    missionModelsFrom(() => undefined),
    () => {},
    client,
  );
  const turn = llm.missionTurn;
  if (turn === undefined) throw new Error("missionTurn 없음");
  const signal = new AbortController().signal;
  for await (const _ of turn.reply({ system: "s", history: [], userText: "u", signal })) void _;
  await turn.feedback({
    text: "u",
    l1: "en",
    previous: null,
    history: [],
    speechLevel: "polite",
    character: null,
    signal,
  });
  await turn.moderate({ layer: "input", text: "u", context: null, ageBand: "adult", signal });
  await turn.translate({ segments: [{ kind: "speech", text: "네" }], l1: "en", signal } as never);
  await llm.gradeMission?.({ user: "g", signal });
  await llm.missionHint?.({ user: "h", signal });
  await llm.judgeMission?.({ user: "j", signal });
  for await (const _ of llm.reply({ system: "s", history: [], userText: "u", signal })) void _;
  expect(sent.map(({ model }) => model)).toEqual([
    "claude-haiku-5-5", // 미션 답
    "claude-haiku-5-5", // 미션 교정
    "c-moderation", // 입력 검사 — 컴패니언 설정
    "c-translation", // 번역 — 컴패니언 설정
    "claude-sonnet-5-5", // 채점
    "claude-haiku-5-5", // 힌트
    "claude-haiku-5-5", // 판정
    "claude-opus-5-5", // 컴패니언 답 — 바뀌지 않음
  ]);
  // Haiku 답은 대체 모델 옵션을 싣지 않고(Haiku 분기), 생각 깊이는 컴패니언과 같은 low.
  expect(sent[0]).toMatchObject({ betas: undefined, effort: "low" });
  expect(llm.graderModel).toBe("claude-sonnet-5-5");
  expect(turn.model).toBe("claude-haiku-5-5");
});

test("LM4. 답 모델을 Sonnet으로 바꾸면 서버 쪽 대체 모델 옵션을 싣는다", async () => {
  const { client, sent } = fakeClient();
  const llm = anthropicMissionLlm(
    anthropicCompanionLlm(config, () => {}, client),
    config,
    missionModelsFrom((name) => (name === missionTurnModelEnv ? "claude-sonnet-5-5" : undefined)),
    () => {},
    client,
  );
  const signal = new AbortController().signal;
  for await (const _ of llm.missionTurn!.reply({ system: "s", history: [], userText: "u", signal }))
    void _;
  expect(sent[0]).toMatchObject({
    model: "claude-sonnet-5-5",
    betas: ["server-side-fallback-2026-07-01"],
  });
});
