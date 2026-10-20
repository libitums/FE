import type { ReactNode } from "@lynx-js/react";

import plasticBag from "@libitums/icons/lynx/plastic-bag";
import refresh from "@libitums/icons/lynx/refresh";
import { color } from "@libitums/design-tokens";

import { useUiCopy } from "../../lib/ui-copy";
import type { CultureCardFace as Face, CultureCardQuestion } from "./culture-card.contract";

import "./culture-card-face.css";

type CultureCardFaceProps = {
  readonly card: CultureCardQuestion;
  readonly face: Face;
  readonly className: string;
  /** 면 · 위치 · 뒤집을 수 있음을 말하는 이름입니다(카드가 접근성 요소 하나). */
  readonly label: string;
  /** 앞면 사진 주소 — `null`이면 브랜드 면 위 아이콘이 섭니다. */
  readonly photoUrl: string | null;
  readonly reducedMotion: boolean;
  readonly onPhotoError: () => void;
  readonly onTap: () => void;
};

// 덱의 맨 앞 카드 한 장입니다. 받은 면을 그릴 뿐 상태는 없습니다(면 · 사진 실패는 `CultureCardActivity`가 집니다).
//
// 접근성: 카드 전체가 **버튼 하나**의 접근성 요소이고 이름이 보이는 글을 대신 읽습니다 — 안의 글줄은 따로 서지 않습니다.
// 뒷면 오른쪽 위 뒤집기 아이콘도 따로 누르는 버튼이 아니라 「카드를 누르면 뒤집힌다」는 표시입니다(탭은 카드가 받습니다).
// 접근성 요소가 아닌 장식(사진 · 명암 · 아이콘)에는 가림 선언을 두지 않습니다(ADR-0016 D5).
export function CultureCardFace({
  card,
  face,
  className,
  label,
  photoUrl,
  reducedMotion,
  onPhotoError,
  onTap,
}: CultureCardFaceProps): ReactNode {
  const copy = useUiCopy();
  // standard에서는 data-motion 속성을 아예 넘기지 않습니다(테스트 렌더러가 undefined를 "null" 문자열로 남깁니다).
  const motionProps = reducedMotion ? { "data-motion": "reduced" } : {};
  return (
    <view
      className={className}
      data-testid="culture-card-face"
      data-face={face}
      {...motionProps}
      accessibility-element={true}
      accessibility-traits="button"
      accessibility-label={label}
      bindtap={onTap}
    >
      {face === "front" ? (
        <view
          className={`culture-card-activity-front culture-card-activity-front-${photoUrl === null ? "panel" : "photo"}`}
        >
          {photoUrl === null ? null : (
            <>
              <image
                className="culture-card-activity-photo"
                data-testid="culture-card-photo"
                src={photoUrl}
                mode="aspectFill"
                binderror={onPhotoError}
              />
              {/* 아래 명암 — 흰 글이 밝은 사진 위에서도 읽히게 합니다. */}
              <view className="culture-card-activity-scrim" data-testid="culture-card-scrim" />
            </>
          )}
          {/* 그림이 없으면 사진 자리 가운데 문화 아이콘이 섭니다. 사진이 있으면 빈 자리라 글을 아래로 밉니다. */}
          <view className="culture-card-activity-visual">
            {photoUrl === null ? (
              <svg
                className="culture-card-activity-panel-icon"
                data-testid="culture-card-panel-icon"
                content={plasticBag}
                current-color={color.white}
              />
            ) : null}
          </view>
          <view className="culture-card-activity-front-text">
            <text className="culture-card-activity-eyebrow" data-testid="culture-card-eyebrow">
              {copy.cultureCard.eyebrow}
            </text>
            <text className="culture-card-activity-front-title" data-testid="culture-card-title">
              {card.title}
            </text>
            {card.titleTranslation === null ? null : (
              <text
                className="culture-card-activity-front-translation"
                data-testid="culture-card-title-translation"
              >
                {card.titleTranslation}
              </text>
            )}
            <view className="culture-card-activity-hint">
              <svg
                className="culture-card-activity-hint-icon"
                content={refresh}
                current-color={color.gray[950]}
              />
              <text
                className="culture-card-activity-hint-text"
                data-testid="culture-card-flip-hint"
              >
                {copy.cultureCard.tapToFlip}
              </text>
            </view>
          </view>
        </view>
      ) : (
        <view className="culture-card-activity-back">
          <view className="culture-card-activity-back-head">
            <view className="culture-card-activity-back-heading">
              <text className="culture-card-activity-back-title" data-testid="culture-card-title">
                {card.title}
              </text>
              {card.titleRomanization === null ? null : (
                <text
                  className="culture-card-activity-romanization"
                  data-testid="culture-card-title-romanization"
                >
                  {card.titleRomanization}
                </text>
              )}
            </view>
            <view className="culture-card-activity-flip-back" data-testid="culture-card-flip-back">
              <svg
                className="culture-card-activity-flip-back-icon"
                content={refresh}
                current-color={color.gray[800]}
              />
            </view>
          </view>
          <text className="culture-card-activity-body" data-testid="culture-card-body">
            {card.body}
          </text>
          {card.koreanBody === null ? null : (
            <view className="culture-card-activity-korean" data-testid="culture-card-korean">
              <text
                className="culture-card-activity-korean-title"
                data-testid="culture-card-korean-title"
              >
                {copy.cultureCard.koreanBodyTitle}
              </text>
              <text
                className="culture-card-activity-korean-text"
                data-testid="culture-card-korean-text"
              >
                {card.koreanBody}
              </text>
            </view>
          )}
        </view>
      )}
    </view>
  );
}
