import { useReducer, useRef } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import arrowLeft03 from "@libitums/icons/lynx/arrow-left-03";
import { Button } from "@libitums/ui-lynx/button";
import { resolveReducedMotion, useMotion } from "@libitums/ui-lynx/motion";
import { RoundButton } from "@libitums/ui-lynx/round-button";
import { VisualNovelDialog } from "@libitums/ui-lynx/visual-novel-dialog";

import { AnswerReveal } from "../../components/AnswerReveal";
import { AnswerVerdict } from "../../components/AnswerVerdict";
import { playSound } from "../../lib/sound-effects";
import { lightStatusBarIcons } from "../../lib/status-bar-icons";
import { useUiCopy } from "../../lib/ui-copy";
import { useAudioCue } from "../../lib/use-audio-cue";
import { useScreenBack } from "../../lib/use-back-handler";
import { NarrativeBackground } from "../episode-narrative/NarrativeBackground";
import {
  SentenceOrderChip,
  SentenceOrderChipPlaceholder,
} from "../sentence-order/SentenceOrderChip";
import {
  canCheckTurn,
  catalogFinalAudioCueOf,
  catalogFinalLineAccessibilityLabel,
  catalogFinalReducer,
  composedReply,
  initialCatalogFinalState,
  judgeRoleplayTurn,
} from "./catalog-final";
import type { CatalogFinalScreenProps } from "./catalog-final.contract";

import "./catalog-final-screen.css";

// 카탈로그 에피소드의 최종 테스트 화면입니다 — 상대 대사를 보고 섞인 타일을 놓아 내 대답을 만듭니다.
// 턴마다 한 번 답하고(`Check`) 판정과 정답을 본 뒤 `Next`로 넘어갑니다. 마지막 턴 뒤 `See results`가
// 결과를 한 번 올립니다.
//
// 그림과 글은 **형제 층**입니다 — 글 층은 그림의 상태를 읽지 않아, 그림이 없거나 늦거나 실패해도 머리 ·
// 대사 · 타일이 첫 프레임부터 서고 바탕은 어두운 단색으로 남습니다. 낭독 순서 = DOM 순서이고
// 지시문 → 내 대답 → 뜻 힌트 → 판정 → 정답 → 타일 창고 → 버튼입니다.
export function CatalogFinalScreen({
  insets,
  ordinal,
  counterpartName,
  turns,
  onFinish,
  onExit,
}: CatalogFinalScreenProps): ReactNode {
  const copy = useUiCopy();
  const reducedMotion = resolveReducedMotion(undefined, useMotion());
  const [state, dispatch] = useReducer(catalogFinalReducer, initialCatalogFinalState);
  const finished = useRef({ done: false });

  const turn = turns[state.turnIndex] ?? turns[0];
  const checked = state.phase === "checked";
  const isLastTurn = state.turnIndex >= turns.length - 1;
  // 판정은 리듀서가 확인 때 `results`에 적은 값입니다 — 화면이 다시 계산하지 않습니다.
  const result = checked ? (state.results[state.turnIndex] ?? null) : null;
  const audio = useAudioCue(catalogFinalAudioCueOf(turn, state));
  const previousImageUrl = turns[state.turnIndex - 1]?.imageUrl ?? null;

  const handleExit = () => {
    "background only";
    audio.stop();
    onExit();
  };
  // 시스템 뒤로가기 = 보이는 나가기와 같은 함수입니다.
  useScreenBack(handleExit);

  const toggle = (tileIndex: number) => {
    "background only";
    playSound("button");
    dispatch({ type: "toggleTile", tileIndex });
  };

  // 버튼은 하나이거나 없습니다 — 타일이 덜 놓였으면 없습니다(「아직 할 수 없다」를 부재로 말합니다).
  const action: { readonly label: string; readonly run: () => void } | null = checked
    ? {
        label: isLastTurn ? copy.common.seeResults : copy.common.next,
        run: () => {
          "background only";
          playSound("button");
          if (!isLastTurn) {
            dispatch({ type: "nextTurn" });
            return;
          }
          // 연타해도 결과는 한 번만 올립니다.
          if (finished.current.done) return;
          finished.current.done = true;
          onFinish(state.results);
        },
      }
    : canCheckTurn(turn, state.placed)
      ? {
          label: copy.common.check,
          run: () => {
            "background only";
            dispatch({ type: "check", result: judgeRoleplayTurn(turn, state.placed) });
          },
        }
      : null;

  return (
    <view
      className="catalog-final-screen"
      data-testid="catalog-final-screen"
      data-statusbar={lightStatusBarIcons}
      // 데이터셋 키는 카멜로 적습니다(하이픈 키는 테스트 환경이 거부합니다) — 속성 이름은 `data-turn-index` 등이 됩니다.
      data-turnIndex={state.turnIndex}
      data-phase={state.phase}
    >
      <view className="catalog-final-screen-backdrop" data-testid="catalog-final-screen-backdrop" />
      {/* 장면 층은 순수 장식입니다 — 그림이 없으면 비우고, 실패하면 투명으로 남아 단색 바탕이 보입니다. */}
      <view className="catalog-final-screen-scene" accessibility-elements-hidden={true}>
        {turn.imageUrl === null ? null : (
          <NarrativeBackground
            key={turn.imageUrl}
            src={turn.imageUrl}
            previousSrc={previousImageUrl}
            animated
            reducedMotion={reducedMotion}
          />
        )}
        <view className="catalog-final-screen-shade" />
      </view>

      <view
        className="catalog-final-screen-safe"
        data-testid="catalog-final-screen-safe"
        flatten={false}
        style={{
          paddingTop: `${insets.top}px`,
          paddingLeft: `${insets.left}px`,
          paddingRight: `${insets.right}px`,
        }}
      >
        <view className="catalog-final-screen-header">
          <view data-testid="catalog-final-screen-back">
            <RoundButton
              accessibilityLabel={copy.common.exitTo.journey}
              icon={arrowLeft03}
              variant="neutral"
              size="xl"
              bindtap={handleExit}
            />
          </view>
          <view className="catalog-final-screen-header-text">
            <text
              className="catalog-final-screen-title"
              data-testid="catalog-final-screen-title"
              accessibility-traits="header"
            >
              {`${copy.catalogMap.episodeLabel(ordinal)} ${copy.catalogMap.finalTitle}`}
            </text>
            <text
              className="catalog-final-screen-progress"
              data-testid="catalog-final-screen-progress"
            >
              {copy.catalogFinal.turnProgress(state.turnIndex + 1, turns.length)}
            </text>
          </view>
        </view>

        <view className="catalog-final-screen-spacer" />

        {/* 상대 대사입니다 — 접근성 요소 하나로 읽히고 안쪽 패널은 가려 이름이 겹치지 않게 합니다. */}
        <view
          className="catalog-final-screen-line"
          data-testid="catalog-final-screen-line"
          accessibility-element={true}
          accessibility-traits="text"
          accessibility-label={catalogFinalLineAccessibilityLabel(turn, counterpartName)}
        >
          <view accessibility-elements-hidden={true}>
            <VisualNovelDialog
              speakerName={counterpartName}
              line={turn.line.ko}
              translation={turn.line.en ?? turn.line.roman ?? undefined}
              reveal="instant"
              continueIndicator="off"
              surface="translucent"
              contentLanguage="learning"
              languageTag="ko"
              reducedMotion={reducedMotion}
            />
          </view>
        </view>

        {/* 답안 판입니다 — 어두운 반투명 면이라 칩 · 판정 배지 · 정답 표시는 dark 면을 받고 버튼은
            그대로입니다. 안쪽이 스크롤해서 큰 글꼴에서도 버튼이 밀려나지 않습니다. */}
        <view className="catalog-final-screen-panel">
          <scroll-view
            className="catalog-final-screen-panel-scroll"
            scroll-orientation="vertical"
            scroll-bar-enable={false}
          >
            <view className="catalog-final-screen-panel-body">
              <text
                className="catalog-final-screen-instruction"
                data-testid="catalog-final-screen-instruction"
              >
                {turn.instruction}
              </text>

              {/* 내 대답 줄입니다 — 놓인 타일이 순서대로 섭니다. 누르면 창고로 돌아갑니다.
                  줄은 **비었을 때만** 접근성 요소입니다 — 타일이 놓인 뒤에도 줄이 요소면 iOS에서
                  안쪽 칩이 가려져 되돌릴 수 없습니다(튜토리얼 문장 순서의 줄과 같은 규칙). */}
              <view
                className="catalog-final-screen-reply"
                data-testid="catalog-final-screen-reply"
                accessibility-element={state.placed.length === 0}
                accessibility-label={
                  state.placed.length === 0
                    ? copy.catalogFinal.replyEmpty
                    : copy.catalogFinal.replyLabel(composedReply(turn, state.placed))
                }
              >
                {state.placed.map((tileIndex, position) => (
                  <SentenceOrderChip
                    key={tileIndex}
                    index={tileIndex}
                    text={turn.tiles[tileIndex]?.ko ?? ""}
                    placedOrdinal={position + 1}
                    disabled={checked}
                    surface="dark"
                    onTap={toggle}
                  />
                ))}
              </view>

              {turn.replyTranslation === null ? null : (
                <text className="catalog-final-screen-hint" data-testid="catalog-final-screen-hint">
                  {copy.catalogFinal.replyHint(turn.replyTranslation)}
                </text>
              )}

              {/* 판정 자리입니다 — 비어 있어도 높이를 지켜 배지가 뜰 때 타일이 밀리지 않습니다. */}
              <view className="catalog-final-screen-verdict-slot">
                {result === null ? null : (
                  <view data-testid="catalog-final-screen-verdict">
                    <AnswerVerdict result={result} surface="dark" />
                  </view>
                )}
              </view>
              {result === "incorrect" ? (
                <AnswerReveal
                  testId="catalog-final-screen-answer"
                  text={copy.catalogFinal.correctAnswer(turn.accepted[0])}
                  surface="dark"
                />
              ) : null}

              <view className="catalog-final-screen-bank" data-testid="catalog-final-screen-bank">
                {turn.tiles.map((tile, tileIndex) =>
                  state.placed.includes(tileIndex) ? (
                    <SentenceOrderChipPlaceholder
                      key={tileIndex}
                      index={tileIndex}
                      text={tile.ko}
                      surface="dark"
                    />
                  ) : (
                    <SentenceOrderChip
                      key={tileIndex}
                      index={tileIndex}
                      text={tile.ko}
                      placedOrdinal={null}
                      disabled={checked}
                      surface="dark"
                      onTap={toggle}
                    />
                  ),
                )}
              </view>
            </view>
          </scroll-view>

          {/* 버튼 자리는 늘 섭니다 — 없다 생겨도 판 높이가 흔들리지 않습니다. */}
          <view className="catalog-final-screen-action" data-testid="catalog-final-screen-action">
            {action === null ? null : (
              <Button
                label={action.label}
                variant="brand"
                size="xl"
                width="fill"
                bindtap={action.run}
              />
            )}
          </view>
          <view style={{ height: `${insets.bottom}px` }} />
        </view>
      </view>
    </view>
  );
}
