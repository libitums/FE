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

/** 미션 턴의 교정은 장면의 기대 화계(`counterpart.learnerRegister`, 기본 존댓말)로 본다 — 어긋나면 고치기(correction). */
export const missionFeedbackSpeechLevel = "polite" as const;

/**
 * 미션 턴 교정의 추가 규칙 — 미션은 음성 입력이 기본이고 학습자는 초급이다. 받아 적기(STT) 탓의 차이와 자연스러운 구어 생략을
 * 학습자 오류로 치지 않게 한다(QA: 「라떼 하나요」를 「주세요」로 고친 오탐). 컴패니언(1단계) 교정에는 붙지 않는다.
 */
export const missionFeedbackRules = `- Voice input: the message is a speech-to-text transcript. Missing or extra punctuation (. , ?), spacing, and numbers written as digits (1잔, 4500원) are transcription artifacts — never give feedback on them, and never return a correction whose only change is one of these.
- Beginner level: the learner is a beginner in a short service-counter role-play. Natural spoken short answers are correct: a noun with 요 ("라떼 하나요", "카드요", "포장이요"), dropped particles ("네 카드요"), fillers (음, 아). Give feedback only on real grammar or word mistakes, the speech-level rule, or non-Korean parts (a message with English words still gets kind "l1_to_ko" with status "ok", as above). Keep each reason to one short sentence with no grammar terms.
- Common beginner mistakes at a service counter are real mistakes, so always correct them (kind "correction"): asking staff with 줘요 instead of 주세요 ("라떼 하나 줘요" → "라떼 하나 주세요" — 줘요 sounds too casual toward a stranger serving you), a particle that changes the meaning ("카드를 할게요" → "카드로 할게요"), and 아니에요 used to decline an offer ("봉투 아니에요" → "봉투는 괜찮아요").
- Fix or suggestion — decide in this order. (1) Is the message wrong (grammar, word, the speech level the scene expects, or meaning not clear)? Then it is a fix: kind "correction" (or "l1_to_ko" for non-Korean parts). (2) If it is not wrong, it is NEVER a correction. Use kind "better" only when a clearly more common, natural phrasing exists that a native speaker would really use here ("봉투 필요 없어요" → "봉투는 괜찮아요"); otherwise status "none". Most correct messages get "none" — a suggestion on every turn is noise. Leave the extra "better" field null in this role-play.`;

/** 장면이 반말일 때(`learnerRegister: casual`) — 존댓말이 화계 어긋남(고치기)이다. 1단계 「존댓말은 늘 괜찮다」를 덮는다. */
export const missionCasualRule = `- This scene expects 반말 from the learner (they are close friends). 존댓말 here is a speech-level mistake: kind "correction", "corrected" in 반말, one item per changed ending.`;

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
  const casual = mission.counterpart.learnerRegister === "casual";
  return {
    text: input.text,
    l1: input.l1,
    previous: null,
    history: recentFeedbackHistory(input.history),
    // 화계 어긋남은 고치기(2026-11-23 사용자 결정 — 더 무겁게): 존댓말 장면의 반말은 correction, 반말 장면의 존댓말도 correction.
    speechLevel: casual ? "casual" : missionFeedbackSpeechLevel,
    character: {
      name: mission.counterpart.label,
      role: mission.counterpart.role,
      banmalFeedback: "correction",
    },
    extraRules: casual ? `${missionFeedbackRules}\n${missionCasualRule}` : missionFeedbackRules,
    signal: input.signal,
  };
}
