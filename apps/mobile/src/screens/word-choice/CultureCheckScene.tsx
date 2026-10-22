import type { ReactNode } from "@lynx-js/react";

import type { AnswerResult } from "../../lib/answer-result";
import type { ConversationCast } from "../../lib/conversation-cast";
import type { LearningDensity } from "../../lib/learning-density";
import type { CultureScene } from "./word-choice-questions";

/** 장면의 진행: 묻는 중 또는 답한 뒤(내 대답 + 판정). */
export type CultureSceneOutcome =
  | { readonly kind: "asking" }
  | { readonly kind: "answered"; readonly reply: string; readonly result: AnswerResult };

export type CultureCheckSceneProps = {
  readonly scene: CultureScene;
  readonly cast: ConversationCast;
  readonly outcome: CultureSceneOutcome;
  readonly density: LearningDensity;
};

// 문화 확인 장면(그림 + 상대 말풍선 + 내 대답)입니다. 껍데기만 있는 단계입니다 — 아직 그리지 않습니다.
export function CultureCheckScene(_props: CultureCheckSceneProps): ReactNode {
  return <view data-testid="word-choice-culture-scene" />;
}
