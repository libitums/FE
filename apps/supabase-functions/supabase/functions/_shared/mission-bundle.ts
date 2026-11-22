// 미션 실험실 번들(`mission-lab-bundle.json`, 규격 v1)을 만듭니다. 대시보드의 「롤플레이 실험실」(Python)은 이 파일만 읽어 미션을
// 돌립니다 — 프롬프트를 다시 쓰지 않습니다. 그래서 모든 글은 서버가 쓰는 틀 · 함수에서 그대로 뽑습니다. 순수 함수입니다
// (파일 읽기 · 쓰기는 `mission-bundle.unit.test.ts`가 합니다 — `pnpm mission:bundle`).
// 규격의 필수 칸은 이름과 뜻을 바꾸지 않고, 칸을 더하는 것만 합니다.

import { z } from "zod";

import {
  feedbackHistoryLimit,
  feedbackContent,
  feedbackSystem,
  translationSystem,
} from "./companion-llm-prompts.ts";
import { feedbackSchema } from "./companion-llm-schemas.ts";
import {
  missionBrief,
  missionFeedbackRequest,
  transcriptLineTemplates,
} from "./mission-context.ts";
import { missionCounterpartBase, type MissionDefinition } from "./mission-definition.ts";
import {
  missionGraderMaxTokens,
  missionFeedbackModelEnv,
  missionGraderModelEnv,
  missionHintModelEnv,
  missionTurnModelEnv,
  missionModelsFrom,
  missionTurnMaxTokens,
} from "./mission-env.ts";
import {
  finishFixtures,
  outputFixtures,
  scoringFixtures,
  transitionFixtures,
} from "./mission-fixtures.ts";
import { graderSchema, graderSystem, graderUserTemplate } from "./mission-grader.ts";
import { hintSchema, hintSystem, hintUserTemplate } from "./mission-hint.ts";
import {
  goalLineTemplate,
  learnedLineBareTemplate,
  learnedLineTemplate,
  learnedNone,
  missionTurnDynamicTemplate,
  requirementWords,
  requiredStatusWords,
  turnSystemStable,
} from "./mission-prompt.ts";
import { defaultMissionScoring, missionHintLimit } from "./mission-score.ts";

export const missionLabBundleVersion = 1;

const contextSentinel = "\u0000context\u0000";

/**
 * 교정 프롬프트를 틀로 — 서버의 `missionFeedbackRequest` → `feedbackSystem` · `feedbackContent`를 자리표 값으로 돌려 그대로 뽑는다.
 * `{{context}}`는 최근 대화 줄들(`contextLine`으로 채워 줄바꿈으로 이은 것, 마지막 `contextLimit`개 · 한 줄 500자).
 */
function feedbackPrompt(sample: MissionDefinition) {
  const request = missionFeedbackRequest(
    {
      ...sample,
      counterpart: {
        ...sample.counterpart,
        label: "{{counterpart_label}}",
        role: "{{counterpart_role}}",
      },
    },
    {
      text: "{{learner_text}}",
      l1: "{{learner_l1}}",
      history: [{ role: "assistant", segments: [{ kind: "speech", text: contextSentinel }] }],
      signal: new AbortController().signal,
    },
  );
  return {
    system: feedbackSystem(request),
    user: feedbackContent(request).replace(`Character: ${contextSentinel}`, "{{context}}"),
    schema: z.toJSONSchema(feedbackSchema),
    contextLine: { counterpart: "Character: {{text}}", learner: "Learner: {{text}}" },
    contextLimit: feedbackHistoryLimit,
    placeholders: {
      learner_text: "이번 학습자 메시지",
      learner_l1: "학습자 언어(BCP 47), 모르면 en",
      counterpart_label: "missions[i].counterpart.label",
      counterpart_role: "missions[i].counterpart.role",
      context: "이번 메시지 앞의 최근 대화(진입 대사 포함)",
    },
  };
}

function missionEntry(mission: MissionDefinition) {
  return {
    id: mission.id,
    episodeId: mission.episodeId,
    version: mission.version,
    title: mission.title,
    scene: mission.scene,
    counterpart: mission.counterpart,
    opening: mission.opening,
    goals: mission.goals,
    targetExpressions: mission.targetExpressions,
    turnLimit: mission.turnLimit,
    turnSystemStable: turnSystemStable(mission, missionCounterpartBase(mission, null)),
    missionBrief: missionBrief(mission),
  };
}

export type MissionLabBundleInput = {
  readonly missions: readonly MissionDefinition[];
  /** 커밋 sha, 또는 커밋되지 않은 변경이 있으면 `working-tree`. */
  readonly commit: string;
  readonly generatedAt: string;
};

export function buildMissionLabBundle(input: MissionLabBundleInput) {
  const [sample] = input.missions;
  if (sample === undefined) throw new Error("번들에 넣을 미션이 없습니다");
  const models = missionModelsFrom(() => undefined);
  return {
    bundleVersion: missionLabBundleVersion,
    generatedAt: input.generatedAt,
    source: { repo: "libitums/FE", commit: input.commit },
    defaults: {
      turnModel: models.turnModel,
      feedbackModel: models.feedbackModel,
      hintModel: models.hintModel,
      graderModel: models.graderModel,
      turnMaxTokens: missionTurnMaxTokens,
      graderMaxTokens: missionGraderMaxTokens,
      // 서버가 이 값을 읽는 환경 변수(운영 값은 여기 없다 — 코드의 기본값만).
      env: {
        turnModel: missionTurnModelEnv,
        feedbackModel: missionFeedbackModelEnv,
        hintModel: missionHintModelEnv,
        graderModel: missionGraderModelEnv,
      },
    },
    scoring: {
      weights: defaultMissionScoring.weights,
      hintPenalty: defaultMissionScoring.hintPenalty,
      hintLimit: missionHintLimit,
      rounding: "half_up — 소수 여섯째 자리에서 정리한 뒤 0.5에서 올린다(Python round()와 다르다)",
      fixtures: scoringFixtures.map(({ name: _name, ...fixture }) => fixture),
    },
    output: {
      segmentPrefixes: { speech: "@speech ", action: "@action " },
      statePrefix: "@state ",
      fixtures: outputFixtures.map(({ raw, expected }) => ({ raw, expected })),
    },
    // 학습자 턴 하나의 전이(목표 합치기 · 끝 판정) — 포팅 검증용으로 더한 칸.
    // 판은 모든 목표(goals) · 턴 상한(turn_limit) · 학습자의 끝내기(finish — 필수를 이룬 뒤에만)로 닫힌다.
    transitions: {
      endRule:
        "턴 뒤: 모든 목표(필수 + 선택)를 이뤘으면 goals, 아니고 학습자 턴 ≥ turnLimit이면 turn_limit, 아니면 null(필수만 이뤘으면 required_done 참 · 판은 이어짐). 끝내기: 끝나지 않았고 필수를 모두 이뤘으면 finish, 필수를 못 이뤘으면 닫지 않음. 성공 = 필수 목표를 모두 이룸(끝난 까닭과 무관).",
      fixtures: transitionFixtures.map(({ name: _name, ...fixture }) => fixture),
      // 끝내기(mission-finish, abandon 없이) — 더한 칸.
      finishFixtures: finishFixtures.map(({ name: _name, ...fixture }) => fixture),
    },
    prompts: {
      turnDynamic: missionTurnDynamicTemplate,
      goalLine: goalLineTemplate,
      requirementWords,
      // `{{required_status}}`의 글 — 이번 메시지 앞의 판 상태로 필수를 다 이뤘으면 done, 아니면 pending. 더한 칸.
      requiredStatusWords,
      // `{{learned_expressions}}`의 한 줄(뜻이 있으면 learnedLine, 없으면 learnedLineBare)과 빈 목록 글 — 규격에 더한 칸.
      learnedLine: learnedLineTemplate,
      learnedLineBare: learnedLineBareTemplate,
      learnedNone,
      feedback: feedbackPrompt(sample),
      hint: { system: hintSystem, user: hintUserTemplate, schema: z.toJSONSchema(hintSchema) },
      grader: {
        system: graderSystem,
        user: graderUserTemplate,
        schema: z.toJSONSchema(graderSchema),
        // 자리표의 뜻 — 더한 칸. corrections_json의 n을 채점자가 focus.refs로 돌려준다(고친 문장은 새로 만들지 않는다).
        placeholders: {
          goals_json: "missions[i].goals의 [{id, required, criteria}]",
          target_expressions_json: "missions[i].targetExpressions 그대로",
          turn_goals_done_json: "턴에서 쌓인 목표 id 배열",
          corrections_json:
            "턴 교정이 있는 학습자 메시지마다 {n(1부터), original(학습자 글), corrected, kind, reason(교정 조각 reason을 공백으로 이은 글 | null)}",
          transcript: "transcriptLine으로 채운 전문(진입 대사 포함)",
          learner_l1: "학습자 언어(BCP 47), 모르면 en",
        },
        // 받은 결과 → 리포트(서버 normalizeGrade · buildMissionReport). 점수는 코드가 낸다.
        report:
          "goals.tip은 최종(턴 ∪ 채점자)으로 못 이룬 목표에만, focus.refs는 1 ~ 교정 수 안의 번호만(묶음 3개까지, 예문 = 그 번호 교정의 original → corrected), strengths 2개까지, retry 3개까지(없으면 못 쓴 목표 표현), scoreParts = 가중치 × 세부 점수(소수 첫째 자리)와 힌트 감점.",
      },
      transcriptLine: transcriptLineTemplates,
      // 대화 기록의 모양(서버 `historyMessages`와 같게) — 실험실이 같은 메시지 목록을 만들게 적어 둔 칸.
      sceneStartUser: null,
      sceneStart:
        "진입 대사는 상대역(assistant) 메시지로 대화 맨 앞에 그대로 둔다. 앞에 고정 user 글을 넣지 않는다 — 1단계 첫 인사 · 선톡 뒤 턴과 같다.",
      // 진입 대사 · 목표 글의 학습자 언어(선택 칸) — 서버는 파일 → 캐시 → 1단계 번역 노드 순서로 고른다(`mission-localize.ts`).
      openingTranslation: {
        system: translationSystem("{{learner_l1}}", "{{count}}"),
        lines:
          "1. [speech] 진입 대사(opening.ko) · 이어서 목표마다 [narration] 목표 글(label.ko ?? label.en). 파일에 그 언어 칸이 있으면 그 줄은 빼고, 결과는 미션 × 판 × 언어로 캐시한다.",
      },
      historyAssistantFormat:
        "지난 상대역 답은 조각마다 `@{kind} {text}` 한 줄(`@speech …` · `@action …`)을 줄바꿈으로 이은 글. 상태 줄(`@state …`)과 저장된 번역은 넣지 않는다. 학습자 글은 보낸 글 그대로.",
    },
    missions: input.missions.map(missionEntry),
  };
}

export type MissionLabBundle = ReturnType<typeof buildMissionLabBundle>;
