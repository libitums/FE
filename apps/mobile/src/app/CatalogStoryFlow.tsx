import { useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import type { SafeAreaInsets } from "../lib/safe-area";
import { EpisodeBannerScreen } from "../screens/catalog-cover/EpisodeBannerScreen";
import { StoryIntroScreen } from "../screens/story-intro/StoryIntroScreen";
import type { StoryIntroView } from "../screens/story-intro/story-intro.contract";

type CatalogStoryFlowProps = {
  readonly insets: SafeAreaInsets;
  /** 시작 화면 — `null`이면 곧장 본편입니다. */
  readonly intro: StoryIntroView | null;
  /** 본편 — 마지막 버튼에서 받은 `finish`를 부르면 배너로 넘어갑니다. */
  readonly renderStory: (finish: () => void) => ReactNode;
  /** 시작 화면의 Start. */
  readonly onStart: () => void;
  /** 시작 화면에서 Skip 확정 — 배너 없이 끝냅니다. */
  readonly onSkip: () => void;
  /** 시작 화면에서 뒤로. */
  readonly onExitIntro: () => void;
  /** 배너가 닫힌 뒤(유지 시간 · 탭 · 시스템 뒤로) — 진행 기록과 돌아가기는 여기서 합니다. */
  readonly onClose: () => void;
};

type Step = "intro" | "story" | "banner";

// 막간 이야기: 시작 화면(Skip · Start) → 본편 → 「To be continued…」 배너(ADR-0088 D6). 기록은 배너가 닫힐 때 한 번
// 남기므로 배너 중에 나가도 이야기를 끝낸 것으로 적힙니다.
export function CatalogStoryFlow({
  insets,
  intro,
  renderStory,
  onStart,
  onSkip,
  onExitIntro,
  onClose,
}: CatalogStoryFlowProps): ReactNode {
  const [step, setStep] = useState<Step>(intro === null ? "story" : "intro");
  if (step === "banner") {
    return <EpisodeBannerScreen insets={insets} kind="continue" onDone={onClose} />;
  }
  if (step === "intro" && intro !== null) {
    return (
      <StoryIntroScreen
        insets={insets}
        intro={intro}
        onStart={() => {
          onStart();
          setStep("story");
        }}
        onSkip={onSkip}
        onExit={onExitIntro}
      />
    );
  }
  return renderStory(() => setStep("banner"));
}
