import { useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import type { SafeAreaInsets } from "../lib/safe-area";
import { EpisodeBannerScreen } from "../screens/catalog-cover/EpisodeBannerScreen";

type CatalogStoryFlowProps = {
  readonly insets: SafeAreaInsets;
  /** 이야기 화면 — 마지막 버튼에서 받은 `finish`를 부르면 배너로 넘어갑니다. */
  readonly renderStory: (finish: () => void) => ReactNode;
  /** 배너가 닫힌 뒤(유지 시간 · 탭 · 시스템 뒤로) — 진행 기록과 돌아가기는 여기서 합니다. */
  readonly onClose: () => void;
};

// 막간 이야기 → 「To be continued…」 배너(ADR-0088). 기록은 배너가 닫힐 때 한 번 남기므로 배너 중에 나가도
// 이야기를 끝낸 것으로 적힙니다.
export function CatalogStoryFlow({
  insets,
  renderStory,
  onClose,
}: CatalogStoryFlowProps): ReactNode {
  const [banner, setBanner] = useState(false);
  if (banner) return <EpisodeBannerScreen insets={insets} kind="continue" onDone={onClose} />;
  return renderStory(() => setBanner(true));
}
