// 미션 턴의 시스템 프롬프트(ADR-0177 D3, PRD §3.4). 순수 함수입니다.
//
// 컴패니언 프롬프트(`companion-prompt.ts`)와 방향이 반대라(「이어 가라」가 아니라 「목표로 이끌고 끝내라」) 따로 둡니다. 친밀도 ·
// 기억 · 화제 · 로맨스 줄이 없습니다. 캐시를 위해 판 내내 같은 앞부분(`turnSystemStable` — 장면 · 역할 카드 · 바탕 네 칸 · 규칙 ·
// 출력 형식)과 턴마다 바뀌는 뒷부분(`turnDynamic` — 목표 상태 · 남은 턴 · 힌트 수 · 학습자 언어 · 배운 표현)으로 나눕니다.
// 모든 글은 「틀 + 채우기」(`mission-template.ts`)라 실험실 번들이 같은 틀을 그대로 씁니다.

import type { LearningExpression } from "./chat-send.contract.ts";
import type { MissionCounterpartBase, MissionDefinition } from "./mission-definition.ts";
import type { MissionProgress } from "./mission-state.ts";
import { fillTemplate } from "./mission-template.ts";

/** 답 끝의 앱용 줄. 학습자에게 보이지 않는다. 조각 형식은 컴패니언과 같고 이 줄만 다르다. */
export const missionStateLine = `@state {"goals_done": [<ids of every goal the learner has completed so far, earlier turns included>], "off_task": <true if the learner's latest message was off the mission topic>, "closing": <true if this reply closes the scene>}`;

/** 판 내내 같은 앞부분의 틀. `base_block`은 캐스트일 때만 채워지고 단역이면 빈 글이다. */
export const missionTurnStableTemplate = `You are playing {{counterpart_label}} in a short role-play mission in Duru, an app where people learn Korean through a story. The learner plays themselves inside the scene and has a task to finish in Korean, in their own words. You are an AI character, and you never claim to be a real human if sincerely asked.

# Scene
{{scene}}

# Your role in this scene
- The learner sees you as: {{counterpart_label}}
- Role: {{role}}
- Relationship to the learner: {{relation}}
- How you talk: {{register}}
- Sample lines:
{{samples}}
{{base_block}}
# Rules
- Speak Korean only, even when the learner writes in another language.
- Stay in this role and this scene. Never step out of it, and never talk about being an AI, the app, the mission or its goals.
- Say one or two short sentences per reply, simple enough for a beginner.
- Never say the learner's lines for them: do not answer your own questions, do not order, pay or decide on their behalf, and do not list the exact words they should say. Leave each goal to the learner.
- Move the scene forward the way a real {{counterpart_label}} would (for example by asking the next natural question), so the learner gets a chance at each goal.
- If the learner goes off topic, answer very briefly and bring them back with a line that belongs in the scene.
- No romance: no flirting, dating talk or affection, whatever the learner says. Stay friendly and professional. No sexual content, profanity, graphic violence or questions about personal information.
- If the learner seems to be in danger or talks about self-harm, respond with care, stay calm, and encourage them to talk to someone they trust.
- When every required goal is done (including by the learner's latest message), close the scene in this reply: wrap it up naturally in one or two sentences (for example hand over the order and say goodbye) and set "closing" to true.

# Output format (strict)
Write one line per message bubble. Start every line with a tag:
- "@speech " for what you say out loud
- "@action " for a short action in third person, e.g. "@action 컵을 건넨다"
Write nothing else: no markdown, no quotes around lines, no translations.
After the bubbles, write exactly one last line for the app (never shown to the learner):
{{state_line}}`;

/** 캐스트의 바탕 네 칸 묶음 틀. 칸이 없으면 그 줄을 뺀다(`base_lines`). */
export const missionBaseTemplate = `
# Who you are underneath (background only: this scene's role and way of talking come first)
{{base_lines}}
- The learner may not know your name yet: do not introduce yourself unless the scene calls for it.
`;

/** 턴마다 바뀌는 뒷부분의 틀. */
export const missionTurnDynamicTemplate = `# Mission state
Goals ([x] = already done):
{{goals_state}}
- Learner turns left, including the message you are answering: {{turns_left}}
- Hints the learner has used: {{hints_used}}
- Learner's language (BCP 47): {{learner_l1}}. Use it only to understand them; always answer in Korean.

# Korean the learner has learned in the app (prefer these words and patterns)
{{learned_expressions}}`;

/** `goals_state`의 한 줄. 목표마다 채워 줄바꿈으로 잇는다. `mark`는 달성이면 "x", 아니면 " ". */
export const goalLineTemplate = "- [{{mark}}] {{id}} ({{requirement}}): {{criteria}}";
export const requirementWords = { required: "required", optional: "optional" } as const;

/** `learned_expressions`의 한 줄(뜻이 있을 때 · 없을 때)과 빈 목록 글. */
export const learnedLineTemplate = "- {{surface}} ({{gloss}})";
export const learnedLineBareTemplate = "- {{surface}}";
export const learnedNone = "- (none yet: keep it very simple)";

const list = (items: readonly string[]) => items.map((item) => `- ${item}`).join("\n");

function baseBlock(base: MissionCounterpartBase | null): string {
  if (base === null) return "";
  const lines = [
    `- Name: ${base.name}${base.age ? ` (${base.age})` : ""}`,
    base.job ? `- Job: ${base.job}` : "",
    base.speech ? `- Speech habits: ${base.speech}` : "",
  ].filter((line) => line !== "");
  return fillTemplate(missionBaseTemplate, { base_lines: lines.join("\n") });
}

/**
 * 미션 하나의 고정 앞부분. `base`는 캐스트의 바탕 네 칸(`missionCounterpartBase`) — 단역이면 null.
 * 서버는 DB 카드에서, 번들은 미션 파일의 `counterpart.base`에서 고른 값을 넘긴다.
 */
export function turnSystemStable(
  mission: MissionDefinition,
  base: MissionCounterpartBase | null,
): string {
  const { counterpart } = mission;
  return fillTemplate(missionTurnStableTemplate, {
    counterpart_label: counterpart.label,
    scene: mission.scene,
    role: counterpart.role,
    relation: counterpart.relation,
    register: counterpart.register,
    samples: list(counterpart.samples),
    base_block: baseBlock(base),
    state_line: missionStateLine,
  });
}

/** 목표 상태 줄들(`goals_state`). 파일 순서대로. */
export function goalsState(mission: MissionDefinition, goalsDone: readonly string[]): string {
  return mission.goals
    .map((goal) =>
      fillTemplate(goalLineTemplate, {
        mark: goalsDone.includes(goal.id) ? "x" : " ",
        id: goal.id,
        requirement: goal.required ? requirementWords.required : requirementWords.optional,
        criteria: goal.criteria,
      }),
    )
    .join("\n");
}

export function learnedExpressions(expressions: readonly LearningExpression[]): string {
  if (expressions.length === 0) return learnedNone;
  return expressions
    .map((entry) =>
      entry.gloss
        ? fillTemplate(learnedLineTemplate, { surface: entry.surface, gloss: entry.gloss })
        : fillTemplate(learnedLineBareTemplate, { surface: entry.surface }),
    )
    .join("\n");
}

export type MissionDynamicInput = {
  readonly mission: MissionDefinition;
  /** 이번 학습자 메시지 앞의 판 상태(이번 턴은 아직 세지 않은 것). */
  readonly progress: MissionProgress;
  /** 학습자 언어(BCP 47). 모르면 null — 영어로 둔다(교정과 같은 기본값). */
  readonly l1: string | null;
  /** 그 에피소드까지의 학습 표현(1단계 `expressions` 그대로). */
  readonly expressions: readonly LearningExpression[];
};

/** 남은 학습자 턴 — 지금 답하는 메시지를 포함한다. */
export const turnsLeftBefore = (mission: MissionDefinition, progress: MissionProgress): number =>
  Math.max(0, mission.turnLimit - progress.learnerTurns);

export function turnDynamic(input: MissionDynamicInput): string {
  return fillTemplate(missionTurnDynamicTemplate, {
    goals_state: goalsState(input.mission, input.progress.goalsDone),
    turns_left: turnsLeftBefore(input.mission, input.progress),
    hints_used: input.progress.hintsUsed,
    learner_l1: input.l1 ?? "en",
    learned_expressions: learnedExpressions(input.expressions),
  });
}

/** 턴 하나의 시스템 프롬프트 두 부분. 서버는 `${stable}${systemSplit}${dynamic}`으로 이어 `reply`에 넘긴다. */
export function missionSystemPrompt(
  input: MissionDynamicInput & { readonly base: MissionCounterpartBase | null },
): { stable: string; dynamic: string } {
  return { stable: turnSystemStable(input.mission, input.base), dynamic: turnDynamic(input) };
}
