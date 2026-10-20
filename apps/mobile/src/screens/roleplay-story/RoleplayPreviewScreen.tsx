import type { ReactNode } from "@lynx-js/react";

import arrowLeft03 from "@libitums/icons/lynx/arrow-left-03";
import mic from "@libitums/icons/lynx/mic";
import { Button } from "@libitums/ui-lynx/button";
import { resolveReducedMotion, useMotion } from "@libitums/ui-lynx/motion";
import { RoundButton } from "@libitums/ui-lynx/round-button";
import { VisualNovelDialog } from "@libitums/ui-lynx/visual-novel-dialog";

import { lightStatusBarIcons } from "../../lib/status-bar-icons";
import { useUiCopy } from "../../lib/ui-copy";
import { useScreenBack } from "../../lib/use-back-handler";
import { NarrativeBackground } from "../episode-narrative/NarrativeBackground";
import type { RoleplayPreviewScreenProps } from "./roleplay-story.contract";

import "./roleplay-story-screen.css";

/**
 * 에피소드 롤플레이의 미리보기입니다 — 에피소드 표지와 같은 틀(장면 그림 · 머리 · 아래 다이얼로그 · 주 버튼)에
 * 상대 · 대사 수 알약과 한 줄 안내를 싣습니다. 누르면 표지 컷 → 말하기 대화가 이어집니다.
 */
export function RoleplayPreviewScreen({
  insets,
  ordinal,
  title,
  counterpartName,
  lineCount,
  imageUrl,
  onStart,
  onExit,
}: RoleplayPreviewScreenProps): ReactNode {
  const copy = useUiCopy();
  const reducedMotion = resolveReducedMotion(undefined, useMotion());
  useScreenBack(onExit);
  const chips = [
    copy.roleplayStory.withCounterpart(counterpartName),
    copy.roleplayStory.lineCount(lineCount),
  ];

  return (
    <view
      className="roleplay-story-screen"
      data-testid="roleplay-preview-screen"
      data-statusbar={lightStatusBarIcons}
    >
      <view className="roleplay-story-screen-backdrop" />
      <view className="roleplay-story-screen-scene" accessibility-elements-hidden={true}>
        {imageUrl === null ? null : (
          <NarrativeBackground
            src={imageUrl}
            previousSrc={null}
            animated={false}
            reducedMotion={reducedMotion}
          />
        )}
        <view className="roleplay-story-screen-shade" />
      </view>

      <view
        className="roleplay-story-screen-safe"
        flatten={false}
        style={{
          paddingTop: `${insets.top}px`,
          paddingBottom: `${insets.bottom}px`,
          paddingLeft: `${insets.left}px`,
          paddingRight: `${insets.right}px`,
        }}
      >
        <view className="roleplay-story-screen-header">
          <view data-testid="roleplay-preview-back">
            <RoundButton
              accessibilityLabel={copy.common.exitTo.roleplay}
              icon={arrowLeft03}
              variant="neutral"
              size="xl"
              bindtap={onExit}
            />
          </view>
          <view className="roleplay-story-screen-header-text">
            <text
              className="roleplay-story-screen-title"
              data-testid="roleplay-preview-title"
              accessibility-traits="header"
            >
              {copy.catalogMap.episodeLabel(ordinal)}
            </text>
            <text
              className="roleplay-story-screen-progress"
              data-testid="roleplay-preview-subtitle"
            >
              {`${copy.roleplay.form.story} · ${title}`}
            </text>
          </view>
        </view>

        <view className="roleplay-story-screen-spacer" />

        <view className="roleplay-story-screen-bottom">
          <view className="roleplay-story-chips" data-testid="roleplay-preview-chips">
            {chips.map((chip) => (
              <text key={chip} className="roleplay-story-chip">
                {chip}
              </text>
            ))}
          </view>
          <view
            data-testid="roleplay-preview-body"
            accessibility-element={true}
            accessibility-label={copy.roleplayStory.previewBody(counterpartName)}
          >
            <view accessibility-elements-hidden={true}>
              <VisualNovelDialog
                variant="narration"
                line={copy.roleplayStory.previewBody(counterpartName)}
                reveal="instant"
                continueIndicator="off"
                surface="opaque"
                contentLanguage="ui"
                reducedMotion={reducedMotion}
              />
            </view>
          </view>
          <view data-testid="roleplay-preview-start">
            <Button
              label={copy.roleplayStory.start}
              variant="brand"
              size="xl"
              width="fill"
              icon={mic}
              bindtap={onStart}
            />
          </view>
        </view>
      </view>
    </view>
  );
}
