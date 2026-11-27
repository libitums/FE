// 에피소드 롤플레이 한 판의 흐름입니다 — 미리보기 → 표지 컷(마지막 컷은 첫 턴이 대신) → 말하기 대화.
// 단계는 화면 로컬입니다(route는 하나) — 뒤로가기는 어느 단계에서든 롤플레이 목록으로 나갑니다.

import { useEffect, useRef, useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import { MicPermissionSheet } from "../components/mic-permission/MicPermissionSheet";
import { useMicPermission } from "../components/mic-permission/use-mic-permission";
import type { AnswerResult } from "../lib/answer-result";
import type { MicPermissionContext } from "../lib/mic-permission-event.contract";
import type { SafeAreaInsets } from "../lib/safe-area";
import type { ChoiceRomanization } from "../lib/session-options";
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
  RoleplayTurnReport,
} from "../screens/roleplay-story/roleplay-story.contract";
import type { RoleplayStoryModel } from "./roleplay-story-model";

type Stage = "preview" | "cuts" | "talk";

export type RoleplayStoryFlowProps = {
  readonly insets: SafeAreaInsets;
  readonly model: RoleplayStoryModel;
  readonly onFinish: (results: readonly AnswerResult[], skippedCount: number) => void;
  readonly onExit: () => void;
  /** 로마자 스위치(ADR-0188) — 컷 대사 아래 로마자 줄. 없으면 `"hidden"`. */
  readonly romanization?: ChoiceRomanization;
  /** 대사 상자 안 로마자 스위치(ADR-0188 개정 D7) — 없으면 스위치를 그리지 않습니다. */
  readonly onRomanizationChange?: (next: ChoiceRomanization) => void;
  /** 마이크 권한 안내의 맥락(ADR-0206) — 이벤트 받는 곳. 없으면 이벤트가 없습니다. */
  readonly mic?: MicPermissionContext;
  /** 턴 하나를 넘기거나 건너뛸 때(측정). */
  readonly onTurnAnswered?: (report: RoleplayTurnReport) => void;
};

export function RoleplayStoryFlow({
  insets,
  model,
  onFinish,
  onExit,
  romanization = "hidden",
  onRomanizationChange,
  mic,
  onTurnAnswered,
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
  // 처음 시작할 때 시스템 창보다 먼저 사전 안내(ADR-0206 D1) — Allow 뒤 답은 아래 `decide`가, Not now는 장면을 그대로 시작합니다
  // (말하기는 턴마다 「Can't speak now」로 넘길 수 있고, 마이크를 누르면 그때 시스템 창이 뜹니다).
  const permission = useMicPermission({
    surface: "roleplay",
    context: mic,
    checkOnOpen: false,
    onSkipSpeaking: () => begin(),
    onAnswer: (status) => decide(status, true),
  });
  // 시작 전 말하기 준비 — 묻지 않은 권한은 시스템 창으로 먼저 묻고, 거부 · 인식기 없음은 안내를 띄웁니다.
  const decide = (status: SpeechStatus, asked: boolean) => {
    if (!mounted.current) return;
    const readiness = speechReadinessOf(status);
    if (readiness === "ready") return begin();
    if (readiness === "ask" && !asked) {
      if (permission.openPrime()) return;
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
      <>
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
        <MicPermissionSheet mic={permission} />
      </>
    );
  }
  if (stage === "cuts" && model.cuts !== null) {
    return (
      <CatalogCoverScreen
        insets={insets}
        stage="prologue"
        ordinal={model.ordinal}
        cuts={model.cuts}
        romanization={romanization}
        onRomanizationChange={onRomanizationChange}
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
      mic={mic}
      onTurnAnswered={onTurnAnswered}
    />
  );
}
