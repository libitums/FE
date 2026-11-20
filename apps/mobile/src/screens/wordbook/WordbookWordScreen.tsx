import type { ReactNode } from "@lynx-js/react";

import arrowLeft from "@libitums/icons/lynx/arrow-left";
import { Button } from "@libitums/ui-lynx/button";
import { RoundButton } from "@libitums/ui-lynx/round-button";

import { useScreenBack } from "../../lib/use-back-handler";
import { useUiCopy } from "../../lib/ui-copy";
import { wordbookTestIds as ids, type WordbookWordScreenProps } from "./wordbook.contract";

import "./wordbook-screen.css";
import "./wordbook-word.css";

// 단어 자세히입니다(ADR-0168, 시안 WordbookDetail). 단어장 위에 쌓이는 화면이라 바텀 메뉴 없이 뒤로가 섭니다. 큰 단어 · 로마자 ·
// Listen / Slow · 뜻, 「From your story」 예문(단어 카드의 예문)과 에피소드, 처음 본 날 · 맞힌 수, 「Practice this word」(그 단어
// 하나의 복습). 카탈로그에서 사라진 단어면 뒤로만 남습니다.
export function WordbookWordScreen({
  entry,
  sound,
  onBack,
  onPractice,
}: WordbookWordScreenProps): ReactNode {
  const copy = useUiCopy().more.wordbook;
  useScreenBack(onBack);
  const source = entry === null ? null : sound.sourceOf(entry);
  const [, month, day] = (entry?.record.firstSeen ?? "").split("-");
  const handlePractice = () => {
    "background only";
    onPractice();
  };
  const listen = (slow: boolean) => () => {
    "background only";
    if (source !== null) sound.play(source, slow);
  };
  return (
    <view className="wordbook-word" data-testid={ids.word}>
      <view className="wordbook-word-head">
        <view className="wordbook-back" data-testid={ids.back}>
          <RoundButton
            accessibilityLabel={copy.back}
            icon={arrowLeft}
            variant="neutral"
            size="m"
            bindtap={onBack}
          />
        </view>
        {entry === null ? null : (
          <view className={`wordbook-chip wordbook-chip-${entry.status}`}>
            <text className="wordbook-chip-label">{copy.status[entry.status]}</text>
          </view>
        )}
      </view>
      {entry === null ? null : (
        <scroll-view
          className="wordbook-scroll"
          scroll-orientation="vertical"
          scroll-bar-enable={false}
        >
          <view className="wordbook-word-body">
            <view className="wordbook-word-card">
              <text className="wordbook-word-ko">{entry.ko}</text>
              <text className="wordbook-word-roman">{entry.roman}</text>
              <view className="wordbook-word-listen">
                <view
                  className={
                    source === null
                      ? "wordbook-pill wordbook-pill-off"
                      : "wordbook-pill wordbook-pill-brand"
                  }
                  data-testid={ids.listen}
                  accessibility-element={true}
                  accessibility-label={copy.listen}
                  accessibility-traits={source === null ? "disabled" : "button"}
                  bindtap={listen(false)}
                >
                  <text className="wordbook-pill-label">{copy.listen}</text>
                </view>
                <view
                  className={source === null ? "wordbook-pill wordbook-pill-off" : "wordbook-pill"}
                  data-testid={ids.slow}
                  accessibility-element={true}
                  accessibility-label={copy.slow}
                  accessibility-traits={source === null ? "disabled" : "button"}
                  bindtap={listen(true)}
                >
                  <text className="wordbook-pill-label">{copy.slow}</text>
                </view>
              </view>
              <view className="wordbook-word-rule" />
              <text className="wordbook-word-meaning">{entry.meaning}</text>
            </view>
            {entry.example === null ? null : (
              <view className="wordbook-word-story">
                <text className="wordbook-word-story-label">{copy.fromStory}</text>
                <text className="wordbook-word-story-ko">{entry.example.ko}</text>
                <text className="wordbook-word-story-sub">
                  {`${entry.example.roman} · ${entry.example.meaning}`}
                </text>
                <text className="wordbook-word-story-sub">
                  {copy.episodeLong(entry.episodeOrder, entry.episodeTitle)}
                </text>
              </view>
            )}
            <view className="wordbook-word-stats">
              <view className="wordbook-word-stat">
                <text className="wordbook-word-stat-label">{copy.firstSeen}</text>
                <text className="wordbook-word-stat-value">
                  {copy.date(Number(month), Number(day))}
                </text>
              </view>
              <view className="wordbook-word-stat">
                <text className="wordbook-word-stat-label">{copy.correct}</text>
                <text className="wordbook-word-stat-value">
                  {copy.correctOf(
                    entry.record.correct,
                    entry.record.correct + entry.record.incorrect,
                  )}
                </text>
              </view>
            </view>
            {entry.example === null ? (
              <text className="wordbook-word-story-sub">
                {copy.episodeLong(entry.episodeOrder, entry.episodeTitle)}
              </text>
            ) : null}
            <view className="wordbook-word-practice" data-testid={ids.practice}>
              <Button
                label={copy.practice}
                variant="neutral"
                size="xl"
                width="fill"
                bindtap={handlePractice}
              />
            </view>
          </view>
        </scroll-view>
      )}
    </view>
  );
}
