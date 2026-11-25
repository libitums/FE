import { useEffect, useGlobalProps, useRef, useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import { safeAreaInsetsFrom } from "../../lib/safe-area";
import { useUiCopy } from "../../lib/ui-copy";
import { useLayerBack } from "../../lib/use-back-handler";
import { STORY_TEXT_COLORS } from "./my-story-editor";
import { myStoriesTestIds as ids, type StoryTextColor } from "./my-stories.contract";

import "./my-stories.css";

/** 글 한 줄의 길이 상한 — 사진 스토리 한 줄과 같게 둡니다(서버 반영 예상). */
const TEXT_MAX = 80;
/** 위 안전 영역 아래 글자색 줄까지의 틈(px, 편집 위 줄과 같은 높이). */
const TOP_GAP = 12;
/** 바탕 위 글 상자의 입력 칸 id(초점 주기). 한 화면에 하나뿐입니다. */
const TYPING_INPUT_ID = "my-story-typing-input";

type NativeInputEvent = { readonly detail: { readonly value: string } };

/** 휴대폰 키보드를 올립니다 — 테스트 환경 · 요소 없음에서는 조용히 넘어갑니다. */
function focusTyping(): void {
  "background only";
  try {
    lynx
      .createSelectorQuery()
      .select(`#${TYPING_INPUT_ID}`)
      .invoke({ method: "focus", params: undefined })
      .exec();
  } catch {
    // 초점을 못 주면 사용자가 칸을 누릅니다.
  }
}

/**
 * Aa — 바탕 위 글 상자 안에서 바로 쓰기(시안 29번, 글 서버에서만). 바탕이 어두워지고 가운데 점선 상자에 휴대폰 키보드로 쓰며, 위에 글자색
 * 넷 · Done. Done이면 상자가 바탕 위 요소가 되고(부르는 쪽), 빈 글이면 상자를 없앱니다. 시스템 뒤로 = Done.
 */
export function MyStoryTextEntry({
  initial,
  initialColor,
  onDone,
}: {
  readonly initial: string;
  readonly initialColor: StoryTextColor;
  readonly onDone: (ko: string, color: StoryTextColor) => void;
}): ReactNode {
  const copy = useUiCopy().messengerChat.myStories.textEntry;
  const insets = safeAreaInsetsFrom(useGlobalProps());
  const [textColor, setTextColor] = useState<StoryTextColor>(initialColor);
  const value = useRef(initial);
  const colorRef = useRef(textColor);
  colorRef.current = textColor;
  const done = () => onDone(value.current, colorRef.current);
  useLayerBack(done);
  useEffect(() => {
    focusTyping();
  }, []);

  return (
    <view
      className="my-story-typing"
      data-testid={ids.textEntry}
      event-through={false}
      style={{ paddingTop: `${insets.top + TOP_GAP}px` }}
    >
      <view className="my-story-typing-top">
        <view className="my-story-typing-colors" accessibility-label={copy.colors}>
          {STORY_TEXT_COLORS.map((each) => (
            <view
              key={each}
              className={`my-story-text-swatch my-story-ink-bg-${each}${each === textColor ? " my-story-text-swatch-on" : ""}`}
              data-testid={ids.textColor(each)}
              accessibility-element={true}
              accessibility-label={copy.colorLabel(copy.color(each), each === textColor)}
              accessibility-traits="button"
              accessibility-enable-tap={true}
              flatten={false}
              bindtap={() => {
                "background only";
                setTextColor(each);
              }}
            />
          ))}
        </view>
        <view
          className="my-story-typing-done"
          data-testid={ids.textDone}
          accessibility-element={true}
          accessibility-label={copy.done}
          accessibility-traits="button"
          accessibility-enable-tap={true}
          flatten={false}
          bindtap={() => {
            "background only";
            done();
          }}
        >
          <text className="my-story-typing-done-text" accessibility-elements-hidden={true}>
            {copy.done}
          </text>
        </view>
      </view>
      <view className="my-story-typing-box">
        <input
          id={TYPING_INPUT_ID}
          className={`my-story-typing-input my-story-ink-${textColor}`}
          data-testid={ids.textInput}
          default-value={initial}
          maxlength={TEXT_MAX}
          confirm-type="done"
          accessibility-element={true}
          accessibility-label={copy.label}
          bindinput={(event: NativeInputEvent) => {
            "background only";
            value.current = event.detail.value;
          }}
          bindconfirm={() => {
            "background only";
            done();
          }}
        />
      </view>
      <text className="my-story-typing-help">{copy.help}</text>
    </view>
  );
}
