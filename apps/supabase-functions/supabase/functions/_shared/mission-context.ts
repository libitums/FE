// 채점 · 힌트 · 교정에 넣는 미션 맥락 — 미션 요약(`missionBrief`), 대화 전문(`missionTranscript`), 교정 요청(`missionFeedbackRequest`).
// 순수 함수입니다. 틀은 실험실 번들(`prompts.transcriptLine`)이 그대로 씁니다.

import type { FeedbackRequest, HistoryEntry } from "./chat-send.contract.ts";
import { recentFeedbackHistory } from "./companion-llm-prompts.ts";
import type { MissionDefinition } from "./mission-definition.ts";
import { requirementWords } from "./mission-prompt.ts";
import { fillTemplate } from "./mission-template.ts";

/** 대화 전문의 한 줄 — 상대역(`label`은 미션의 호칭) · 학습자. */
export const transcriptLineTemplates = {
  counterpart: "{{label}}: {{text}}",
  learner: "Learner: {{text}}",
} as const;

export const missionBriefTemplate = `Scene: {{scene}}
Counterpart: {{label}}. {{role}} Relationship: {{relation}}
Goals:
{{goals}}
Turn limit: {{turn_limit}} learner turns`;

const briefGoalTemplate = "- {{id}} ({{requirement}}): {{criteria}}";

/** 채점 · 힌트의 `{{mission_brief}}` — 장면 · 상대역 · 목표 요약. */
export function missionBrief(mission: MissionDefinition): string {
  return fillTemplate(missionBriefTemplate, {
    scene: mission.scene,
    label: mission.counterpart.label,
    role: mission.counterpart.role,
    relation: mission.counterpart.relation,
    goals: mission.goals
      .map((goal) =>
        fillTemplate(briefGoalTemplate, {
          id: goal.id,
          requirement: goal.required ? requirementWords.required : requirementWords.optional,
          criteria: goal.criteria,
        }),
      )
      .join("\n"),
    turn_limit: mission.turnLimit,
  });
}

export type TranscriptEntry = { readonly role: "counterpart" | "learner"; readonly text: string };

/** 저장된 판의 메시지(진입 대사 포함, 오래된 것부터) → 전문 줄. 상대역의 행동 조각은 `*…*`로 감싼다. */
export function transcriptFromHistory(history: readonly HistoryEntry[]): TranscriptEntry[] {
  return history
    .map((entry): TranscriptEntry => {
      if (entry.role === "user") return { role: "learner", text: entry.text.trim() };
      const text = entry.segments
        .map((segment) => (segment.kind === "speech" ? segment.text : `*${segment.text}*`))
        .join(" ");
      return { role: "counterpart", text: text.trim() };
    })
    .filter((entry) => entry.text !== "");
}

/** `{{transcript}}` — 한 줄에 한 메시지. */
export function missionTranscript(
  mission: MissionDefinition,
  entries: readonly TranscriptEntry[],
): string {
  return entries
    .map((entry) =>
      entry.role === "learner"
        ? fillTemplate(transcriptLineTemplates.learner, { text: entry.text })
        : fillTemplate(transcriptLineTemplates.counterpart, {
            label: mission.counterpart.label,
            text: entry.text,
          }),
    )
    .join("\n");
}

/** 미션 턴의 교정은 서비스 장면이라 존댓말 관계로 본다 — 반말이면 부드럽게(`better`) 제안한다. */
export const missionFeedbackSpeechLevel = "polite" as const;

/**
 * 미션 턴의 교정 요청. 교정 프롬프트 · 스키마는 컴패니언과 같고(`feedbackSystemParts` · `feedbackContent`), 상대 캐릭터는 미션의
 * 호칭과 역할이다. `history`는 이번 학습자 메시지 앞까지의 판 메시지(진입 대사 포함).
 */
export function missionFeedbackRequest(
  mission: MissionDefinition,
  input: {
    readonly text: string;
    readonly l1: string | null;
    readonly history: readonly HistoryEntry[];
    readonly signal: AbortSignal;
  },
): FeedbackRequest {
  return {
    text: input.text,
    l1: input.l1,
    previous: null,
    history: recentFeedbackHistory(input.history),
    speechLevel: missionFeedbackSpeechLevel,
    character: {
      name: mission.counterpart.label,
      role: mission.counterpart.role,
      banmalFeedback: "better",
    },
    signal: input.signal,
  };
}
