// 에피소드 롤플레이 한 판의 흐름입니다 — 미리보기 → 표지 컷(마지막 컷은 첫 턴이 대신) → 말하기 대화.
// 단계는 화면 로컬입니다(route는 하나) — 뒤로가기는 어느 단계에서든 롤플레이 목록으로 나갑니다.

import { useEffect, useRef, useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import type { AnswerResult } from "../lib/answer-result";
import type { SafeAreaInsets } from "../lib/safe-area";
import {
  getSpeechStatus,
  openSpeechSettings,
  requestSpeechPermissions,
} from "../lib/speech-recognition";
import type { SpeechStatus } from "../lib/speech-recognition";
import { CatalogCoverScreen } from "../screens/catalog-cover/CatalogCoverScreen";
import { RoleplayPreviewScreen } from "../screens/roleplay-story/RoleplayPreviewScreen";
import { RoleplayTalkScreen } from "../screens/roleplay-story/RoleplayTalkScreen";
import { speechReadinessOf } from "../screens/roleplay-story/roleplay-story";
import type {
  RoleplaySpeechNotice,
  RoleplaySpeechNoticeAction,
} from "../screens/roleplay-story/roleplay-story.contract";
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
  const [notice, setNotice] = useState<RoleplaySpeechNotice | null>(null);
  // 권한 조회 · 요청은 호스트를 거쳐 늦게 돌아옵니다 — 떠난 뒤 돌아온 답이 단계를 바꾸지 않게 막습니다.
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const begin = () => setStage(model.cuts === null ? "talk" : "cuts");
  // 시작 전 말하기 준비 — 묻지 않은 권한은 시스템 창으로 먼저 묻고, 거부 · 인식기 없음은 안내를 띄웁니다.
  const decide = (status: SpeechStatus, asked: boolean) => {
    if (!mounted.current) return;
    const readiness = speechReadinessOf(status);
    if (readiness === "ready") return begin();
    if (readiness === "ask" && !asked) {
      const requested = requestSpeechPermissions((next) => decide(next, true));
      if (requested === "unavailable") begin();
      return;
    }
    setNotice(readiness === "unsupported" ? "unsupported" : "blocked");
  };
  const start = () => {
    "background only";
    // 접점이 없으면(개발 루프 · 옛 호스트) 조용히 시작합니다 — 능력 부재는 사용자가 되돌릴 수 없습니다(ADR-0026 D3).
    if (getSpeechStatus((status) => decide(status, false)) === "unavailable") begin();
  };
  const onNoticeAction = (action: RoleplaySpeechNoticeAction) => {
    "background only";
    setNotice(null);
    if (action === "settings") openSpeechSettings();
    if (action === "anyway") begin();
  };

  if (stage === "preview") {
    return (
      <RoleplayPreviewScreen
        insets={insets}
        ordinal={model.ordinal}
        title={model.title}
        counterpartName={model.counterpartName}
        lineCount={model.turns.length}
        imageUrl={model.imageUrl}
        onStart={start}
        onExit={onExit}
        speechNotice={notice}
        onSpeechNoticeAction={onNoticeAction}
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
