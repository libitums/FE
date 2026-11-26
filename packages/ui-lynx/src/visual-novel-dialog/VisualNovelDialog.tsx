import { color } from "@libitums/design-tokens";
import arrowDown from "@libitums/icons/lynx/arrow-down";

import { useMotion } from "../motion/MotionProvider";
import {
  getVisualNovelDialogContract,
  type VisualNovelDialogProps,
  type VisualNovelDialogVariant,
} from "./visual-novel-dialog.contract";

// 계속 표시는 세 갈래 모두 brand.primary입니다(FE override, 2026-09-28 디자인 반영) — 대사를
// 다 읽은 뒤 「눌러서 넘기라」를 알리는 자리라, 흐린 회색이면 눈에 들지 않았습니다.
const indicatorColors = {
  speech: color.brand.primary,
  narration: color.brand.primary,
  thought: color.brand.primary,
} as const satisfies Readonly<Record<VisualNovelDialogVariant, string>>;

const indicatorContents = {
  speech: arrowDown.replace(/currentColor/g, indicatorColors.speech),
  narration: arrowDown.replace(/currentColor/g, indicatorColors.narration),
  thought: arrowDown.replace(/currentColor/g, indicatorColors.thought),
} as const satisfies Readonly<Record<VisualNovelDialogVariant, string>>;

export function VisualNovelDialog(props: VisualNovelDialogProps) {
  const contract = getVisualNovelDialogContract(props, useMotion());
  const tappable = props.bindtap !== undefined;
  const headerSwitch = contract.headerSwitch;
  // 스위치가 있으면 대사 낭독을 루트가 아니라 따로 선 요소가 집니다 — iOS에서 접근성 요소 안의 자손은 닿지 않아, 루트가
  // 요소이면 스위치에 닿을 수 없습니다. 이때 화면에 선 글은 각각 가려 두 번 읽지 않게 합니다(ADR-0188 개정 D7).
  const split = headerSwitch !== undefined;
  const hideText = split ? true : undefined;
  const handleTap = () => {
    "background only";
    props.bindtap?.();
  };
  const handleSwitch = () => {
    "background only";
    if (headerSwitch !== undefined) props.headerSwitch?.onChange(!headerSwitch.checked);
  };

  const switchControl =
    headerSwitch === undefined ? null : (
      <view
        className={`ui-lynx-visual-novel-dialog-switch${headerSwitch.checked ? " ui-lynx-visual-novel-dialog-switch-on" : ""}`}
        data-testid="ui-lynx-visual-novel-dialog-switch"
        data-checked={String(headerSwitch.checked)}
        accessibility-element={true}
        accessibility-label={headerSwitch.accessibilityLabel}
        accessibility-traits="button"
        accessibility-role-description="switch"
        accessibility-enable-tap={true}
        flatten={false}
        // 대사 상자의 탭(`bindtap`)으로 번지지 않게 직접 받아 끊습니다.
        catchtap={handleSwitch}
      >
        <text
          className="ui-lynx-visual-novel-dialog-switch-label"
          data-testid="ui-lynx-visual-novel-dialog-switch-label"
          text-maxline="1"
        >
          {headerSwitch.label}
        </text>
        <view
          className={`ui-lynx-visual-novel-dialog-switch-track${headerSwitch.checked ? " ui-lynx-visual-novel-dialog-switch-track-on" : ""}`}
          data-testid="ui-lynx-visual-novel-dialog-switch-track"
        >
          <view className="ui-lynx-visual-novel-dialog-switch-knob" />
        </view>
      </view>
    );

  return (
    <view
      className={contract.className}
      data-testid="ui-lynx-visual-novel-dialog"
      data-advance={contract.advance}
      data-avatar={contract.avatar}
      data-language={contract.contentLanguage}
      data-lang={contract.languageTag}
      data-reveal={contract.reveal}
      data-status={contract.status}
      data-surface={contract.surface}
      data-variant={contract.variant}
      accessibility-element={!split}
      accessibility-label={split ? undefined : contract.accessibilityLabel}
      accessibility-traits={split ? undefined : "text"}
      // 누를 곳이 없으면 탭을 흘려보내고, `bindtap`이 있으면 직접 받아 전파를 끊습니다.
      event-through={!tappable && !split}
      catchtap={tappable ? handleTap : undefined}
      focusable={false}
    >
      <view
        className="ui-lynx-visual-novel-dialog-surface"
        data-testid="ui-lynx-visual-novel-dialog-surface"
        accessibility-elements-hidden={true}
      />
      {split ? (
        // 대사 낭독 요소 — 상자 전체를 덮지만 글 층 아래라 탭은 글 층이 받습니다.
        <view
          className="ui-lynx-visual-novel-dialog-reading"
          data-testid="ui-lynx-visual-novel-dialog-reading"
          accessibility-element={true}
          accessibility-label={contract.accessibilityLabel}
          accessibility-traits="text"
        />
      ) : null}
      <view
        className="ui-lynx-visual-novel-dialog-content"
        accessibility-elements-hidden={split ? undefined : true}
      >
        {contract.speakerName ? (
          <view
            className="ui-lynx-visual-novel-dialog-speaker-row"
            data-testid="ui-lynx-visual-novel-dialog-speaker-row"
          >
            {props.avatar !== undefined ? (
              <view
                className="ui-lynx-visual-novel-dialog-avatar"
                data-testid="ui-lynx-visual-novel-dialog-avatar"
                accessibility-elements-hidden={hideText}
              >
                {props.avatar}
              </view>
            ) : null}
            <text
              className="ui-lynx-visual-novel-dialog-speaker"
              data-testid="ui-lynx-visual-novel-dialog-speaker"
              accessibility-elements-hidden={hideText}
            >
              {contract.speakerName}
            </text>
            {switchControl}
          </view>
        ) : switchControl ? (
          // 화자가 없는 상자(내레이션)도 스위치는 같은 자리(맨 위 줄 오른쪽)에 섭니다.
          <view
            className="ui-lynx-visual-novel-dialog-header-row"
            data-testid="ui-lynx-visual-novel-dialog-header-row"
          >
            {switchControl}
          </view>
        ) : null}
        {contract.aside ? (
          <view
            className="ui-lynx-visual-novel-dialog-aside"
            data-testid="ui-lynx-visual-novel-dialog-aside"
            accessibility-elements-hidden={hideText}
          >
            <text className="ui-lynx-visual-novel-dialog-aside-text">{contract.aside}</text>
            {contract.asideTranslation ? (
              <text className="ui-lynx-visual-novel-dialog-aside-text">
                {contract.asideTranslation}
              </text>
            ) : null}
          </view>
        ) : null}
        <view
          className="ui-lynx-visual-novel-dialog-line-row"
          accessibility-elements-hidden={hideText}
        >
          <view className="ui-lynx-visual-novel-dialog-line-slot">
            <text
              className="ui-lynx-visual-novel-dialog-line"
              style={{ visibility: "hidden" }}
              data-testid="ui-lynx-visual-novel-dialog-measure"
            >
              {contract.line}
            </text>
            <text
              className="ui-lynx-visual-novel-dialog-line ui-lynx-visual-novel-dialog-line-reveal"
              data-testid="ui-lynx-visual-novel-dialog-line"
            >
              {contract.visibleLine || "\u200B"}
            </text>
          </view>
          {contract.continueIndicator === "on" ? (
            <view
              className="ui-lynx-visual-novel-dialog-indicator-frame"
              data-testid="ui-lynx-visual-novel-dialog-continue-indicator"
              style={{ visibility: contract.showContinueIndicator ? "visible" : "hidden" }}
            >
              <svg
                className="ui-lynx-visual-novel-dialog-indicator"
                content={indicatorContents[contract.variant]}
                current-color={indicatorColors[contract.variant]}
              />
            </view>
          ) : null}
        </view>
        {/* 로마자는 대사 바로 아래 · 구분선 위입니다 — 읽는 법은 한국어에 붙고 구분선 아래는 뜻만입니다(ADR-0188 개정 D7). */}
        {contract.romanization ? (
          <text
            className="ui-lynx-visual-novel-dialog-romanization"
            data-testid="ui-lynx-visual-novel-dialog-romanization"
            accessibility-elements-hidden={hideText}
            style={{ visibility: contract.showRomanization ? "visible" : "hidden" }}
          >
            {contract.romanization}
          </text>
        ) : null}
        {contract.translation ? (
          <view
            className="ui-lynx-visual-novel-dialog-translation-block"
            data-testid="ui-lynx-visual-novel-dialog-translation-block"
            accessibility-elements-hidden={hideText}
            style={{ visibility: contract.showTranslation ? "visible" : "hidden" }}
          >
            <view
              className="ui-lynx-visual-novel-dialog-divider"
              data-testid="ui-lynx-visual-novel-dialog-divider"
            />
            <text
              className="ui-lynx-visual-novel-dialog-translation"
              data-testid="ui-lynx-visual-novel-dialog-translation"
            >
              {contract.translation}
            </text>
          </view>
        ) : null}
      </view>
    </view>
  );
}
