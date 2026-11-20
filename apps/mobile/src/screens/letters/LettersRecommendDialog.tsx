import type { ReactNode } from "@lynx-js/react";

import { Dialog } from "@libitums/ui-lynx/dialog";

import { RECOMMEND_ART, jamoTileRomanOf, syllableRomanOf } from "../../lib/letters/jamo";
import { useLayerBack } from "../../lib/use-back-handler";
import { useUiCopy } from "../../lib/ui-copy";
import { lettersTestIds as ids, type LettersRecommendDialogProps } from "./letters.contract";

import "./letters-recommend.css";

// 여정맵 Letters 추천 대화상자입니다(ADR-0169, 시안 RecommendWrong · RecommendSyllable). ui-lynx `Dialog` 그대로(폭 화면−64 · 최대 320 ·
// 스크림 · 단추 세로)에 제목 위 그림(ㄱ + ㅏ = 가 타일)을 얹습니다 — 그림은 장식이라 낭독에서 가립니다. 첫 액션(brand)이 「Learn the
// letters」, 아래가 「Keep going」이고 시스템 뒤로는 닫기(`back`)입니다.
export function LettersRecommendDialog({
  reason,
  onLearn,
  onLater,
}: LettersRecommendDialogProps): ReactNode {
  const copy = useUiCopy().more.recommend;
  const handleAction = (id: string) => {
    "background only";
    if (id === "learn") onLearn();
    else onLater("keep_going");
  };
  useLayerBack(() => onLater("back"));
  const tile = (letter: string, roman: string, result: boolean) => (
    <view
      className={
        result ? "letters-recommend-tile letters-recommend-result" : "letters-recommend-tile"
      }
    >
      <text className="letters-recommend-roman">{roman}</text>
      <text className="letters-recommend-letter">{letter}</text>
    </view>
  );
  return (
    <view className="letters-recommend" data-testid={ids.recommend}>
      <Dialog
        title={reason === "hard" ? copy.hardTitle : copy.failedTitle}
        description={reason === "hard" ? copy.hardBody : copy.failedBody}
        actions={[
          { id: "learn", label: copy.learn },
          { id: "later", label: copy.later },
        ]}
        bindaction={handleAction}
      >
        <view
          className="letters-recommend-art"
          data-testid="letters-recommend-art"
          accessibility-elements-hidden={true}
        >
          {tile(RECOMMEND_ART.consonant, jamoTileRomanOf(RECOMMEND_ART.consonant), false)}
          <text className="letters-recommend-op">+</text>
          {tile(RECOMMEND_ART.vowel, jamoTileRomanOf(RECOMMEND_ART.vowel), false)}
          <text className="letters-recommend-op">=</text>
          {tile(RECOMMEND_ART.syllable, syllableRomanOf(RECOMMEND_ART.syllable), true)}
        </view>
      </Dialog>
    </view>
  );
}
