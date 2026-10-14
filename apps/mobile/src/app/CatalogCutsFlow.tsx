import { useRef, useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import type { SafeAreaInsets } from "../lib/safe-area";
import { useUiCopy } from "../lib/ui-copy";
import { CatalogCoverScreen } from "../screens/catalog-cover/CatalogCoverScreen";
import type { CatalogCuts } from "../screens/catalog-cover/catalog-cover.contract";
import { EpisodeBannerScreen } from "../screens/catalog-cover/EpisodeBannerScreen";
import { EpisodeIntroScreen } from "../screens/episode-intro/EpisodeIntroScreen";
import type { EpisodeIntroExitStage } from "../screens/episode-intro/episode-intro.contract";
import { catalogTitleLines } from "../screens/journey-map/catalog-title";
import { CATALOG_INTRO_TITLE_MAX_CHARS, nextCatalogCutsFlowStep } from "./catalog-cuts-flow";
import type { CatalogCutsFlowEvent, CatalogCutsFlowStep } from "./catalog-cuts-flow";

export type CatalogCoverFlowProps = {
  readonly insets: SafeAreaInsets;
  readonly ordinal: number;
  /** 에피소드 이름 — 표지의 둘째 줄 */
  readonly title: string;
  readonly cuts: CatalogCuts;
  /** 확인 모달에서 건너뛰기를 골랐을 때 */
  readonly onSkip: () => void;
  /** 표지의 `Next` — 컷으로 넘기는 것은 이 컴포넌트가 합니다. */
  readonly onContinue: () => void;
  /** 표지(`intro`)나 컷(`prologue`)에서 뒤로 */
  readonly onExit: (stage: EpisodeIntroExitStage) => void;
  /** 마지막 컷의 버튼 — 배너가 서기 전에 불립니다. */
  readonly onCutsDone: () => void;
  /** 배너가 닫힌 뒤 */
  readonly onClose: () => void;
};

export type CatalogEpilogueFlowProps = {
  readonly insets: SafeAreaInsets;
  readonly ordinal: number;
  readonly cuts: CatalogCuts;
  /** 컷에서 나가기 — 배너 없이 */
  readonly onExit: () => void;
  /** 배너가 닫힌 뒤 */
  readonly onClose: () => void;
};

// 걸음은 ref로 들어 같은 틱의 연타도 봅니다. 걸음이 바뀐 사건만 `true`를 내므로 콜백은 그때만
// 부릅니다. `left`는 화면이 없는 끝 걸음이라 직전 걸음의 화면을 그대로 둡니다.
function useCutsFlowStep(initial: CatalogCutsFlowStep): {
  readonly shown: CatalogCutsFlowStep;
  readonly send: (event: CatalogCutsFlowEvent) => boolean;
} {
  const current = useRef({ step: initial });
  const [shown, setShown] = useState(initial);
  const send = (event: CatalogCutsFlowEvent): boolean => {
    "background only";
    const next = nextCatalogCutsFlowStep(current.current.step, event);
    if (next === current.current.step) return false;
    current.current.step = next;
    if (next !== "left") setShown(next);
    return true;
  };
  return { shown, send };
}

// 띄어쓰기에서만 끊습니다. 줄이 비는 일은 없지만 타입이 비어 있지 않은 줄을 요구합니다.
function introTitleLines(title: string): readonly [string, ...string[]] {
  const [first, ...rest] = catalogTitleLines(title, CATALOG_INTRO_TITLE_MAX_CHARS).lines;
  return first === undefined ? [title] : [first, ...rest];
}

/** 표지 → 컷 → 시작 배너. 걸음이 바뀔 때만 콜백을 부릅니다. */
export function CatalogCoverFlow({
  insets,
  ordinal,
  title,
  cuts,
  onSkip,
  onContinue,
  onExit,
  onCutsDone,
  onClose,
}: CatalogCoverFlowProps): ReactNode {
  const copy = useUiCopy();
  const { shown, send } = useCutsFlowStep("intro");

  if (shown === "banner") {
    return (
      <EpisodeBannerScreen
        insets={insets}
        kind="start"
        onDone={() => {
          "background only";
          if (send("banner-done")) onClose();
        }}
      />
    );
  }
  if (shown === "cuts") {
    return (
      <CatalogCoverScreen
        stage="prologue"
        insets={insets}
        ordinal={ordinal}
        cuts={cuts}
        onComplete={() => {
          "background only";
          if (send("cuts-done")) onCutsDone();
        }}
        onExit={() => {
          "background only";
          if (send("exit")) onExit("prologue");
        }}
      />
    );
  }
  return (
    <EpisodeIntroScreen
      insets={insets}
      label={copy.catalogMap.episodeLabel(ordinal)}
      title={title}
      titleLines={introTitleLines(title)}
      skipDescription={copy.catalogCover.skipDescription}
      onBack={() => {
        "background only";
        if (send("exit")) onExit("intro");
      }}
      onSkip={() => {
        "background only";
        if (send("skip")) onSkip();
      }}
      onNext={() => {
        "background only";
        if (send("continue")) onContinue();
      }}
    />
  );
}

/** 컷 → 클리어 배너. 컷에서 나가면 배너 없이 `onExit`입니다. */
export function CatalogEpilogueFlow({
  insets,
  ordinal,
  cuts,
  onExit,
  onClose,
}: CatalogEpilogueFlowProps): ReactNode {
  const { shown, send } = useCutsFlowStep("cuts");

  if (shown === "banner") {
    return (
      <EpisodeBannerScreen
        insets={insets}
        kind="clear"
        onDone={() => {
          "background only";
          if (send("banner-done")) onClose();
        }}
      />
    );
  }
  return (
    <CatalogCoverScreen
      stage="epilogue"
      insets={insets}
      ordinal={ordinal}
      cuts={cuts}
      onComplete={() => {
        "background only";
        send("cuts-done");
      }}
      onExit={() => {
        "background only";
        if (send("exit")) onExit();
      }}
    />
  );
}
