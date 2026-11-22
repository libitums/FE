import { useEffect, useRef, useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import { Button } from "@libitums/ui-lynx/button";
import { useMotion } from "@libitums/ui-lynx/motion";

import { announceCompletion } from "../../lib/accessibility";
import { ENTRY_BASICS_SENTENCE, ENTRY_BASICS_WORDS } from "../../lib/entry-basics";
import { useUiCopy } from "../../lib/ui-copy";
import { useScreenBack } from "../../lib/use-back-handler";
import { useLeaveOnce } from "../../lib/use-leave-once";
import { EntryBasicsProgress } from "./EntryBasicsFrame";
import { READY_SETTLE_MS } from "./entry-basics-motion";
import { entryBasicsTestIds as ids } from "./entry-basics.contract";
import type { EntryBasicsReadyScreenProps } from "./entry-basics.contract";

import "./entry-basics-ready.css";

// 준비 완료입니다(ADR-0176, 시안 Ready). 방금 만든 가 · 너 · 도가 「너 도 가」로 다시 서고(「가」가 위로 넘어감), 그 뒤 제목 · 뜻 ·
// 비행기가 나타나며 문장을 한 번 낭독합니다. 단추는 처음부터 눌립니다. 동작 줄이기면 처음부터 끝 모습입니다.
//
// 셸이 여백을 잡지 않습니다 — 바탕이 그림 바탕색(#FEFEFE)으로 끝까지 가야 그림의 네모가 드러나지 않습니다.
export function EntryBasicsReadyScreen({
  safeArea,
  planeUrl,
  onNext,
  onBack,
}: EntryBasicsReadyScreenProps): ReactNode {
  const copy = useUiCopy().journeyEntry.firstSteps;
  const motion = useMotion();
  const reduced = motion === "reduced";
  const leave = useLeaveOnce();
  useScreenBack(() => leave(onBack));

  const [arrived, setArrived] = useState(false);
  const settled = reduced || arrived;
  useEffect(() => {
    if (reduced) {
      setArrived(true);
      return undefined;
    }
    const handle = setTimeout(() => setArrived(true), READY_SETTLE_MS);
    return () => clearTimeout(handle);
  }, [reduced]);

  const spoken = `${ENTRY_BASICS_SENTENCE} ${copy.readyMeaning}`;
  const announced = useRef(false);
  useEffect(() => {
    if (!settled || announced.current) return;
    announced.current = true;
    announceCompletion(spoken);
  }, [settled]);

  const reveal = !settled
    ? " entry-basics-reveal-waiting"
    : reduced
      ? ""
      : " entry-basics-reveal-entering";
  const planeReveal = !settled
    ? " entry-basics-reveal-waiting"
    : reduced
      ? ""
      : " entry-basics-plane-entering";

  return (
    <view
      className="entry-basics-ready"
      data-testid={ids.ready}
      data-phase={settled ? "settled" : "moving"}
      data-motion={motion}
    >
      <view
        className="entry-basics-ready-inner"
        style={{ paddingTop: `${safeArea.top}px`, paddingBottom: `${safeArea.bottom}px` }}
      >
        <view className="entry-basics-ready-header">
          <EntryBasicsProgress current={3} />
        </view>
        <scroll-view
          className="entry-basics-ready-scroll"
          data-testid={`${ids.ready}-scroll`}
          scroll-orientation="vertical"
          scroll-bar-enable={false}
        >
          <view className="entry-basics-ready-content">
            {/* 이름은 투명해지지 않는 상자가 집니다 — 투명한 글은 iOS 낭독 순회에서 빠집니다(ADR-0053 D7). */}
            <view
              className="entry-basics-ready-text"
              data-testid={ids.title}
              flatten={false}
              accessibility-element={true}
              accessibility-label={copy.readyTitle}
              accessibility-heading={true}
              accessibility-traits="header"
            >
              <text className={`entry-basics-ready-title${reveal}`} accessibility-element={false}>
                {copy.readyTitle}
              </text>
            </view>
            <view
              className="entry-basics-sentence"
              data-testid={ids.sentence}
              flatten={false}
              accessibility-element={true}
              accessibility-label={spoken}
            >
              {ENTRY_BASICS_WORDS.map(({ syllable, roman, round }, index) => (
                <view
                  key={syllable}
                  className={
                    reduced
                      ? "entry-basics-word"
                      : `entry-basics-word entry-basics-word-from-${round}`
                  }
                  data-testid={ids.word(index)}
                  flatten={false}
                >
                  <view className="entry-basics-word-face">
                    <text
                      className="tile-romanization entry-basics-word-roman"
                      accessibility-element={false}
                    >
                      {roman}
                    </text>
                    <text className="entry-basics-word-glyph" accessibility-element={false}>
                      {syllable}
                    </text>
                  </view>
                </view>
              ))}
              <text className={`entry-basics-question${reveal}`} accessibility-element={false}>
                ?
              </text>
            </view>
            <text
              className={`entry-basics-meaning${reveal}`}
              data-testid={ids.meaning}
              accessibility-element={false}
            >
              {copy.readyMeaning}
            </text>
            <view className="entry-basics-plane-box" accessibility-elements-hidden={true}>
              {planeUrl === null ? null : (
                <image
                  className={`entry-basics-plane${planeReveal}`}
                  data-testid={ids.plane}
                  src={planeUrl}
                  mode="aspectFit"
                />
              )}
            </view>
            <view
              className="entry-basics-ready-text"
              flatten={false}
              accessibility-element={true}
              accessibility-label={copy.readyBody}
            >
              <text className={`entry-basics-ready-body${reveal}`} accessibility-element={false}>
                {copy.readyBody}
              </text>
            </view>
          </view>
        </scroll-view>
        <view className="entry-basics-ready-footer">
          <view className="entry-basics-next entry-basics-ready-next" data-testid={ids.next}>
            <Button
              label={copy.readyGo}
              variant="brand"
              size="xl"
              width="fill"
              bindtap={() => leave(onNext)}
            />
          </view>
        </view>
      </view>
    </view>
  );
}
