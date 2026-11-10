import { useEffect, useGlobalProps } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import clock from "@libitums/icons/lynx/clock";
import infinity from "@libitums/icons/lynx/infinity";
import { color } from "@libitums/design-tokens";
import { Button } from "@libitums/ui-lynx/button";

import { coinIcon } from "../../components/coin-icon";
import { screenHeightFrom } from "../../lib/learning-density";
import { safeAreaInsetsFrom } from "../../lib/safe-area";
import { useUiCopy } from "../../lib/ui-copy";
import { fontScaleFrom } from "../../lib/viewport-metrics";
import { restoreAccessibilityFocus } from "./chat-input-focus";
import { chatTurnsTestIds as ids, type OutOfFreePanelProps } from "./chat-turns.contract";
import { outPanelMaxHeightOf } from "./scroll-budget";
import { useScrollBudget } from "./use-scroll-budget";

import "./chat-turns.css";

/** 열린 뒤 한 프레임(16 ms)이 지나야 뒤 화면의 낭독 숨김이 풀려 초점을 받을 수 있습니다(a11y C1). */
const NEXT_FRAME_MS = 16;
/** 작은 화면(SE 667)에서는 시계 원을 숨겨 세로 예산을 맞춥니다(design 6절). */
const COMPACT_HEIGHT = 700;
const FIXED_KEYS = ["actions"] as const;
/**
 * 이 배율부터 Keep chatting을 세로로 쌓습니다(F3, 기기 AX5). `flex-wrap`의 줄바꿈은 컨테이너 높이에 두 번째 줄이 안 잡혀
 * 가격 줄이 잘리고 잔액 줄이 밀려 나갔습니다. 세로 쌓기는 높이가 내용을 그대로 따릅니다. 가장 큰 접근성 글자(AX5 ≈ 3.1)만 닿는 값입니다.
 */
export const KEEP_STACK_FONT_SCALE = 2.6;

/**
 * 오늘의 무료 메시지를 다 쓴 판(T3)입니다 — 독(기능 줄 · 입력 · 토글 · 키보드 자리) 전체를 대신합니다.
 * 판은 모달입니다 — 열리면 제목(dialog 역할 설명)에 접근성 초점이 가고, 뒤 화면(머리 · 로그)은 화면에서 숨깁니다(호출 쪽).
 * 큰 글자에서 넘치지 않게 px 최대 높이를 걸고 아이콘 · 제목 · 본문만 스크롤하며 단추 셋 · 잔액 줄은 스크롤 밖에 고정합니다(접근성 M1). 단추 셋은 Keep chatting(주) · Go unlimited · Back to chats입니다.
 * 잔액이 가격보다 모자라도 셋은 그대로입니다 — Keep chatting 뒤 엽전 보내기에서 상점으로 이어집니다.
 */
export function OutOfFreePanel({
  total,
  price,
  balance,
  reset,
  onKeepChatting,
  onGoUnlimited,
  onBackToChats,
  bottomInset = 0,
}: OutOfFreePanelProps): ReactNode {
  const copy = useUiCopy().messengerChat.turns;
  const globalProps = useGlobalProps();
  const screenHeight = screenHeightFrom(typeof SystemInfo === "undefined" ? undefined : SystemInfo);
  const compact = screenHeight < COMPACT_HEIGHT;
  const maxHeight = outPanelMaxHeightOf({
    screenHeight,
    insetTop: safeAreaInsetsFrom(globalProps).top,
    fontScale: fontScaleFrom(globalProps),
  });
  const budget = useScrollBudget(maxHeight, FIXED_KEYS);
  const keepClass =
    (fontScaleFrom(globalProps) ?? 1) >= KEEP_STACK_FONT_SCALE
      ? "chat-out-keep chat-out-keep-stacked"
      : "chat-out-keep";

  useEffect(() => {
    const handle = setTimeout(() => restoreAccessibilityFocus(ids.panelTitle), NEXT_FRAME_MS);
    return () => clearTimeout(handle);
  }, []);

  // 시간 조각만 굵게 하려고 본문을 앞 · 시간 · 뒤로 쪼갭니다. 문구 함수의 결과에서 시간 글을 찾아 가릅니다.
  const clockText = copy.reset(reset.hours, reset.minutes);
  const body = copy.outBody(clockText);
  const at = body.indexOf(clockText);
  const pieces =
    at < 0
      ? ([body, "", ""] as const)
      : ([body.slice(0, at), clockText, body.slice(at + clockText.length)] as const);

  return (
    <view
      className="chat-out-panel"
      data-testid={ids.panel}
      style={maxHeight === null ? undefined : { maxHeight: `${maxHeight}px` }}
    >
      <scroll-view
        className="chat-out-scroll"
        data-testid={ids.panelScroll}
        scroll-orientation="vertical"
        scroll-bar-enable={false}
        style={budget.height === null ? undefined : { height: `${budget.height}px` }}
      >
        <view
          className="chat-out-scroll-content"
          data-testid={ids.panelScrollContent}
          bindlayoutchange={budget.onContentLayout}
        >
          {compact ? null : (
            <view className="chat-out-clock" accessibility-elements-hidden={true}>
              <svg className="chat-turn-icon-md" content={clock} current-color={color.fg.brand} />
            </view>
          )}
          <text
            className="chat-out-title"
            id={ids.panelTitle}
            accessibility-element={true}
            accessibility-traits="header"
            accessibility-role-description="dialog"
          >
            {copy.outTitle(total)}
          </text>
          <text className="chat-out-body" accessibility-element={true} accessibility-label={body}>
            {pieces[0]}
            {pieces[1] === "" ? null : <text className="chat-out-body-time">{pieces[1]}</text>}
            {pieces[2]}
          </text>
        </view>
      </scroll-view>
      <view
        className="chat-out-actions"
        data-testid={ids.panelActions}
        style={{ paddingBottom: `${16 + bottomInset}px` }}
        bindlayoutchange={budget.onFixedLayout("actions")}
      >
        <view
          className={keepClass}
          id={ids.panelKeep}
          data-testid={ids.panelKeep}
          accessibility-element={true}
          accessibility-traits="button"
          accessibility-label={copy.keepChattingLabel(price)}
          bindtap={() => {
            "background only";
            onKeepChatting();
          }}
        >
          <text className="chat-out-keep-label" accessibility-elements-hidden={true}>
            {copy.keepChatting}
          </text>
          <view className="chat-coin-disc" accessibility-elements-hidden={true}>
            <svg className="chat-turn-icon-xs" content={coinIcon} />
          </view>
          <text className="chat-out-keep-price" accessibility-elements-hidden={true}>
            {copy.perMessage(price)}
          </text>
        </view>
        <view
          className="chat-out-action"
          id={ids.panelUnlimited}
          data-testid={ids.panelUnlimited}
          accessibility-element={true}
          accessibility-traits="button"
          accessibility-label={copy.goUnlimited}
          accessibility-enable-tap={true}
          bindtap={() => {
            "background only";
            onGoUnlimited();
          }}
        >
          <view accessibility-elements-hidden={true}>
            <Button
              label={copy.goUnlimited}
              variant="outline"
              size="l"
              width="fill"
              icon={infinity}
              iconPosition="leading"
            />
          </view>
        </view>
        <view
          className="chat-out-action chat-out-action-text"
          id={ids.panelBack}
          data-testid={ids.panelBack}
          accessibility-element={true}
          accessibility-traits="button"
          accessibility-label={copy.backToChats}
          accessibility-enable-tap={true}
          bindtap={() => {
            "background only";
            onBackToChats();
          }}
        >
          <view accessibility-elements-hidden={true}>
            <Button label={copy.backToChats} variant="text" size="l" width="fill" />
          </view>
        </view>
        <text
          className="chat-out-balance"
          data-testid={ids.panelBalance}
          accessibility-element={true}
        >
          {copy.balance(balance)}
        </text>
      </view>
    </view>
  );
}
