// 에피소드 롤플레이 한 판의 흐름입니다 — 미리보기 → 표지 컷(마지막 컷은 첫 턴이 대신) → 말하기 대화.
// 단계는 화면 로컬입니다(route는 하나) — 뒤로가기는 어느 단계에서든 롤플레이 목록으로 나갑니다.

import { useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import type { AnswerResult } from "../lib/answer-result";
import type { SafeAreaInsets } from "../lib/safe-area";
import { CatalogCoverScreen } from "../screens/catalog-cover/CatalogCoverScreen";
import { RoleplayPreviewScreen } from "../screens/roleplay-story/RoleplayPreviewScreen";
import { RoleplayTalkScreen } from "../screens/roleplay-story/RoleplayTalkScreen";
import type { RoleplayStoryModel } from "./roleplay-story-model";

type Stage = "preview" | "cuts" | "talk";

export type RoleplayStoryFlowProps = {
  readonly insets: SafeAreaInsets;
  readonly model: RoleplayStoryModel;
  readonly onFinish: (results: readonly AnswerResult[], skippedCount: number) => void;
  readonly onExit: () => void;
};

export function RoleplayStoryFlow({
  insets,
  model,
  onFinish,
  onExit,
}: RoleplayStoryFlowProps): ReactNode {
  const [stage, setStage] = useState<Stage>("preview");

  if (stage === "preview") {
    return (
      <RoleplayPreviewScreen
        insets={insets}
        ordinal={model.ordinal}
        title={model.title}
        counterpartName={model.counterpartName}
        lineCount={model.turns.length}
        imageUrl={model.imageUrl}
        onStart={() => setStage(model.cuts === null ? "talk" : "cuts")}
        onExit={onExit}
      />
    );
  }
  if (stage === "cuts" && model.cuts !== null) {
    return (
      <CatalogCoverScreen
        insets={insets}
        stage="prologue"
        ordinal={model.ordinal}
        cuts={model.cuts}
        onComplete={() => setStage("talk")}
        onExit={onExit}
      />
    );
  }
  return (
    <RoleplayTalkScreen
      insets={insets}
      ordinal={model.ordinal}
      counterpartName={model.counterpartName}
      turns={model.turns}
      wildcards={model.wildcards}
      onFinish={onFinish}
      onExit={onExit}
    />
  );
}
