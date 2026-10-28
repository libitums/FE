// `catalog-story` route를 막간 이야기 화면으로 옮깁니다(ADR-0088). 문자 막간은 메신저, 그 밖은 컷 화면이고, 끝나면
// 「To be continued…」 배너 뒤 진행에 적고 맵으로 돌아갑니다.

import type { ReactNode } from "@lynx-js/react";

import { CatalogCoverScreen } from "../screens/catalog-cover/CatalogCoverScreen";
import { StoryMessengerScreen } from "../screens/story-messenger/StoryMessengerScreen";
import { CatalogStoryFlow } from "./CatalogStoryFlow";
import { catalogStoryModelOf } from "./catalog-story";
import type { Screen } from "./nav-state";
import type { ScreenWiring } from "./screen-wiring";

export function renderCatalogStory(
  screen: Extract<Screen, { name: "catalog-story" }>,
  wiring: ScreenWiring,
): ReactNode {
  const { episodeId, unitKey } = screen;
  const model = catalogStoryModelOf(
    wiring.episodeContent,
    wiring.catalogSections,
    episodeId,
    unitKey,
    wiring.learnerFill,
  );
  // 시작 결선이 이 경우를 막으므로 여기 닿으면 결함입니다 — 에러 경계가 받습니다.
  if (model === null) {
    throw new Error(`Catalog story has no playable cuts: ${episodeId}/${unitKey}`);
  }
  const key = `${episodeId}:${unitKey}:${model.version}`;
  const chat = model.chat;
  return (
    <CatalogStoryFlow
      key={key}
      insets={wiring.safeAreaInsets}
      onClose={() => wiring.onFinishCatalogStory(episodeId, unitKey)}
      renderStory={(finish) =>
        chat !== null ? (
          <StoryMessengerScreen
            insets={wiring.safeAreaInsets}
            chat={chat}
            onComplete={finish}
            onExit={wiring.onExitCatalogStory}
          />
        ) : (
          <CatalogCoverScreen
            stage="interlude"
            insets={wiring.safeAreaInsets}
            ordinal={model.ordinal}
            cuts={model.cuts}
            onComplete={finish}
            onExit={wiring.onExitCatalogStory}
          />
        )
      }
    />
  );
}
