import { useRef, useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import arrowLeft03 from "@libitums/icons/lynx/arrow-left-03";
import { Button } from "@libitums/ui-lynx/button";
import { resolveReducedMotion, useMotion } from "@libitums/ui-lynx/motion";
import { RoundButton } from "@libitums/ui-lynx/round-button";
import { useTypewriter } from "@libitums/ui-lynx/typewriter";
import { VisualNovelDialog } from "@libitums/ui-lynx/visual-novel-dialog";

import { lightStatusBarIcons } from "../../lib/status-bar-icons";
import { useUiCopy } from "../../lib/ui-copy";
import { useAudioCue } from "../../lib/use-audio-cue";
import { useScreenBack } from "../../lib/use-back-handler";
import { NarrativeBackground } from "../episode-narrative/NarrativeBackground";
import {
  catalogCutAccessibilityLabel,
  catalogCutAudioCueOf,
  catalogCutHasToggle,
  catalogCutSpeakerName,
  catalogCutTranslation,
  nextCatalogCutIndex,
  nextCatalogCutScript,
} from "./catalog-cover";
import type { CatalogCoverScreenProps, CatalogCutScript } from "./catalog-cover.contract";
import { voiceRevealIntervalMs } from "./voice-reveal";

import "./catalog-cover-screen.css";

// 완료는 한 번만 올립니다 — 처음 부른 쪽만 true를 받습니다.
function claimCompletion(guard: { done: boolean }): boolean {
  if (guard.done) return false;
  guard.done = true;
  return true;
}

// 카탈로그 에피소드의 컷 화면입니다 — 에피소드 앞(표지, `stage="prologue"`)과 최종 테스트
// 통과 뒤(`"epilogue"`)가 같은 화면이고, 다른 것은 마지막 버튼의 낭독 하나뿐입니다. 컷을 차례로 보이고, 대사 상자를 누르면 영어와 로마자를 번갈아 보이며,
// 진행은 아래 버튼 하나뿐입니다(화면 어디를 눌러도 넘어가지 않습니다 — 토글 탭과 겹치지 않게).
//
// 그림과 글은 **형제 층**입니다. 글 층은 그림의 상태를 읽지 않으므로 그림이 없거나 늦거나 실패해도 머리 ·
// 대사 · 버튼이 첫 프레임부터 섭니다. 로드 전 투명 처리는 그림 층에만 걸립니다.
// 대사는 튜토리얼처럼 타자기로 쓰이고(소리 길이를 알면 그 길이에 맞춰), 쓰는 중 첫 탭은 대사를 완성하며 다음 탭이 컷을 넘깁니다.
export function CatalogCoverScreen({
  insets,
  stage,
  ordinal,
  cuts,
  onComplete,
  onExit,
}: CatalogCoverScreenProps): ReactNode {
  const copy = useUiCopy();
  const [index, setIndex] = useState(0);
  // 읽는 사람의 선택이라 컷을 넘겨도 유지됩니다. 화면을 나가면 버립니다.
  const [script, setScript] = useState<CatalogCutScript>("en");
  const completion = useRef({ done: false });
  const reducedMotion = resolveReducedMotion(undefined, useMotion());

  const cut = cuts[index] ?? cuts[0];
  const total = cuts.length;
  const audio = useAudioCue(catalogCutAudioCueOf(cut, index));
  const hasToggle = catalogCutHasToggle(cut.text);
  const isLast = nextCatalogCutIndex(index, total) === null;
  const typing = useTypewriter({
    text: cut.text.ko,
    resetKey: index,
    reducedMotion,
    intervalMs: voiceRevealIntervalMs(cut.voiceSyncMs ?? null, cut.text.ko),
  });
  const translation = catalogCutTranslation(cut.text, script) ?? undefined;
  const dialogCommon = {
    line: cut.text.ko,
    translation,
    reveal: "typewriter",
    status: typing.isComplete ? "ready" : "revealing",
    visibleCharacterCount: typing.visibleCharacterCount,
    reducedMotion,
    continueIndicator: "off",
    surface: "opaque",
    contentLanguage: "learning",
    languageTag: "ko",
  } as const;

  const handleToggle = () => {
    "background only";
    if (hasToggle) setScript(nextCatalogCutScript);
  };
  const handleNext = () => {
    "background only";
    // 쓰는 중 첫 탭은 대사를 끝까지 보이고, 다음 탭이 컷을 넘깁니다.
    if (!typing.isComplete) {
      typing.finish();
      return;
    }
    const next = nextCatalogCutIndex(index, total);
    if (next !== null) {
      setIndex(next);
      return;
    }
    // 마지막 컷의 버튼은 완료를 한 번만 올립니다 — 연타해도 기록 · 이동이 겹치지 않습니다.
    if (!claimCompletion(completion.current)) return;
    onComplete();
  };
  const handleExit = () => {
    "background only";
    audio.stop();
    onExit();
  };
  // 시스템 뒤로가기 = 보이는 나가기와 같은 함수입니다.
  useScreenBack(handleExit);

  const buttonLabel = isLast ? copy.common.continue : copy.common.next;

  return (
    <view
      className="catalog-cover-screen"
      data-testid="catalog-cover-screen"
      data-statusbar={lightStatusBarIcons}
      // 데이터셋 키는 카멜로 적습니다(하이픈 키는 테스트 환경이 거부합니다) — 속성 이름은 `data-cut-index` 등이 됩니다.
      data-cutIndex={index}
      data-script={script}
    >
      <view className="catalog-cover-screen-backdrop" data-testid="catalog-cover-screen-backdrop" />
      {/* 장면 층은 순수 장식입니다 — 그림이 없으면 비우고, 실패하면 투명으로 남아 단색 배경이 보입니다. */}
      <view className="catalog-cover-screen-scene" accessibility-elements-hidden={true}>
        {cut.imageUrl === null ? null : (
          <NarrativeBackground
            key={cut.imageUrl}
            src={cut.imageUrl}
            previousSrc={cuts[index - 1]?.imageUrl ?? null}
            animated
            reducedMotion={reducedMotion}
          />
        )}
        <view className="catalog-cover-screen-shade" />
      </view>

      <view
        className="catalog-cover-screen-safe"
        data-testid="catalog-cover-screen-safe"
        flatten={false}
        style={{
          paddingTop: `${insets.top}px`,
          paddingBottom: `${insets.bottom}px`,
          paddingLeft: `${insets.left}px`,
          paddingRight: `${insets.right}px`,
        }}
      >
        <view className="catalog-cover-screen-header">
          <view data-testid="catalog-cover-screen-back">
            <RoundButton
              accessibilityLabel={copy.common.exitTo.journey}
              icon={arrowLeft03}
              variant="neutral"
              size="xl"
              bindtap={handleExit}
            />
          </view>
          <view className="catalog-cover-screen-header-text">
            <text
              className="catalog-cover-screen-title"
              data-testid="catalog-cover-screen-title"
              accessibility-traits="header"
            >
              {copy.catalogMap.episodeLabel(ordinal)}
            </text>
            <text className="catalog-cover-screen-progress">
              {copy.visualNovel.sceneProgress(index + 1, total)}
            </text>
          </view>
        </view>

        <view className="catalog-cover-screen-spacer" />

        <view className="catalog-cover-screen-dialogue">
          {/* 대사 상자는 접근성 요소 하나입니다 — 토글이 있으면 버튼으로 서고, 안쪽 패널은 가려 이름이 겹치지 않게 합니다. */}
          <view
            className="catalog-cover-screen-line"
            data-testid="catalog-cover-screen-line"
            data-cutKind={cut.kind}
            accessibility-element={true}
            accessibility-traits={hasToggle ? "button" : "text"}
            accessibility-label={catalogCutAccessibilityLabel(cut, script, copy)}
            catchtap={handleToggle}
          >
            <view accessibility-elements-hidden={true}>
              <scroll-view
                className="catalog-cover-screen-scroll"
                scroll-orientation="vertical"
                scroll-bar-enable={false}
              >
                {cut.kind === "narration" ? (
                  <VisualNovelDialog variant="narration" {...dialogCommon} />
                ) : cut.voice === "thought" ? (
                  // 독백 — 주황 테두리 패널(design 컷 1). 독백에는 지문이 없다(와이어 모양).
                  <VisualNovelDialog
                    variant="thought"
                    speakerName={catalogCutSpeakerName(cut.speaker, copy)}
                    {...dialogCommon}
                  />
                ) : (
                  <VisualNovelDialog
                    speakerName={catalogCutSpeakerName(cut.speaker, copy)}
                    aside={cut.aside?.ko}
                    asideTranslation={cut.aside?.en ?? undefined}
                    {...dialogCommon}
                  />
                )}
              </scroll-view>
            </view>
          </view>

          <view
            className="catalog-cover-screen-next"
            data-testid="catalog-cover-screen-next"
            accessibility-element={true}
            accessibility-traits="button"
            accessibility-label={
              isLast
                ? stage === "prologue"
                  ? copy.catalogCover.finishCover
                  : copy.catalogCover.finishEpilogue
                : copy.catalogCover.nextCut(index + 1, total)
            }
            bindtap={handleNext}
          >
            <view accessibility-elements-hidden={true}>
              <Button label={buttonLabel} variant="brand" size="xl" width="fill" />
            </view>
          </view>
        </view>
      </view>
    </view>
  );
}
